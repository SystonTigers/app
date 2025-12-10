/**
 * League Table Calculator
 * Scrapes results from FA website + snippet, calculates full standings
 * Compares with FA official table, computes GF/GA/GD, syncs to backend
 */

class LeagueTableCalculator {
  constructor(config) {
    this.config = config || this.loadConfig_();
    this.cache = CacheService.getScriptCache();
  }

  /**
   * Load configuration from backend
   */
  loadConfig_() {
    const consolidator = new FixtureConsolidator();
    return consolidator.config;
  }

  /**
   * Main entry point - Calculate and sync league table
   */
  calculateAndSyncLeagueTable(competition) {
    Logger.log('=== League Table Calculator ===');
    Logger.log('Competition: ' + (competition || 'auto-detect'));

    try {
      // Step 1: Gather all results from available sources
      const results = this.gatherAllResults_();
      Logger.log('Gathered ' + results.length + ' results');

      if (results.length === 0) {
        Logger.log('No results available yet');
        return { success: false, error: 'No results available' };
      }

      // Step 2: Extract competition if not provided
      if (!competition && results.length > 0) {
        competition = results[0].competition;
      }

      // Filter results for this competition
      const compResults = results.filter(r => r.competition === competition);
      Logger.log('Results for ' + competition + ': ' + compResults.length);

      // Step 3: Calculate standings from our results
      const calculatedStandings = this.calculateStandings_(compResults);
      Logger.log('Calculated standings for ' + calculatedStandings.length + ' teams');

      // Step 4: Scrape FA official table for comparison
      const faStandings = this.scrapeFALeagueTable_(competition);
      Logger.log('Scraped FA table: ' + (faStandings ? faStandings.length + ' teams' : 'failed'));

      // Step 5: Merge FA official data with our calculations
      const mergedStandings = this.mergeStandings_(calculatedStandings, faStandings);
      Logger.log('Merged standings: ' + mergedStandings.length + ' teams');

      // Step 6: Sync to backend
      const syncResult = this.syncToBackend_(competition, mergedStandings);
      Logger.log('Backend sync: ' + (syncResult.success ? 'SUCCESS' : 'FAILED'));

      return {
        success: true,
        competition: competition,
        teams: mergedStandings.length,
        synced: syncResult.success
      };

    } catch (e) {
      Logger.log('ERROR: ' + e.message);
      Logger.log(e.stack);
      return { success: false, error: e.message };
    }
  }

  /**
   * Gather results from all sources
   */
  gatherAllResults_() {
    const results = [];

    // Source 1: FA Website scraping
    try {
      const websiteResults = this.scrapeWebsiteResults_();
      results.push(...websiteResults);
      Logger.log('Website results: ' + websiteResults.length);
    } catch (e) {
      Logger.log('Website scraping failed: ' + e.message);
    }

    // Source 2: FA Snippet
    try {
      const snippetResults = this.scrapeSnippetResults_();
      results.push(...snippetResults);
      Logger.log('Snippet results: ' + snippetResults.length);
    } catch (e) {
      Logger.log('Snippet scraping failed: ' + e.message);
    }

    // Source 3: Email parsing (if available)
    try {
      const emailResults = this.parseEmailResults_();
      results.push(...emailResults);
      Logger.log('Email results: ' + emailResults.length);
    } catch (e) {
      Logger.log('Email parsing failed: ' + e.message);
    }

    // Deduplicate
    return this.deduplicateResults_(results);
  }

  /**
   * Scrape results from FA website
   */
  scrapeWebsiteResults_() {
    if (!this.config.faWebsiteUrl) {
      return [];
    }

    const resultsUrl = this.config.faWebsiteUrl.replace('/fixtures', '/results');
    const response = UrlFetchApp.fetch(resultsUrl, { muteHttpExceptions: true });

    if (response.getResponseCode() !== 200) {
      return [];
    }

    const html = response.getContentText();
    const results = [];

    // Parse HTML for results (adapt to FA website structure)
    // Look for result rows: <tr class="result">
    const resultRegex = /<tr[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;

    while ((match = resultRegex.exec(html)) !== null) {
      const rowHtml = match[1];

      // Extract data from row
      const result = this.parseResultRow_(rowHtml);
      if (result && this.isOurTeam_(result.homeTeam) || this.isOurTeam_(result.awayTeam)) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Parse single result row
   */
  parseResultRow_(html) {
    // Extract cells
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(html)) !== null) {
      const cellText = this.stripHTML_(cellMatch[1]);
      cells.push(cellText.trim());
    }

    if (cells.length < 5) {
      return null;
    }

    // Common structure: [Date, Home Team, Score, Away Team, Competition]
    // Example: ["15/11/2025", "Shepshed U16", "3 - 1", "Anstey Nomads U16", "Division Four"]

    const scoreMatch = cells[2].match(/(\d+)\s*-\s*(\d+)/);
    if (!scoreMatch) {
      return null;
    }

    return {
      date: this.parseDate_(cells[0]),
      homeTeam: cells[1],
      awayTeam: cells[3],
      homeScore: parseInt(scoreMatch[1]),
      awayScore: parseInt(scoreMatch[2]),
      competition: cells[4] || '',
      source: 'website'
    };
  }

  /**
   * Scrape results from FA snippet
   */
  scrapeSnippetResults_() {
    if (!this.config.faSnippetUrl) {
      return [];
    }

    try {
      const parser = new FASnippetParser();
      // Modify to fetch results instead of fixtures
      const data = parser.parseSnippet();

      // Filter for completed matches only
      return data.filter(item => item.status === 'completed' && item.homeScore != null);
    } catch (e) {
      return [];
    }
  }

  /**
   * Parse email results (from result emails)
   */
  parseEmailResults_() {
    // Search for FA result emails
    const threads = GmailApp.search('from:@thefa.com subject:result', 0, 50);
    const results = [];

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const message of messages) {
        const parsed = this.parseResultEmail_(message);
        if (parsed) {
          results.push(parsed);
        }
      }
    }

    return results;
  }

  /**
   * Parse single result email
   */
  parseResultEmail_(message) {
    const body = message.getPlainBody();
    const subject = message.getSubject();

    // Look for score pattern: "Team A 3 - 1 Team B"
    const scoreMatch = body.match(/([A-Za-z\s&]+)\s+(\d+)\s*-\s*(\d+)\s+([A-Za-z\s&]+)/);
    if (!scoreMatch) {
      return null;
    }

    const dateMatch = body.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

    return {
      date: dateMatch ? this.parseDate_(dateMatch[0]) : message.getDate(),
      homeTeam: scoreMatch[1].trim(),
      awayTeam: scoreMatch[4].trim(),
      homeScore: parseInt(scoreMatch[2]),
      awayScore: parseInt(scoreMatch[3]),
      competition: this.extractCompetition_(subject + ' ' + body),
      source: 'email'
    };
  }

  /**
   * Calculate league standings from results
   */
  calculateStandings_(results) {
    const standings = {};

    // Initialize teams
    for (const result of results) {
      if (!standings[result.homeTeam]) {
        standings[result.homeTeam] = this.initializeTeam_(result.homeTeam);
      }
      if (!standings[result.awayTeam]) {
        standings[result.awayTeam] = this.initializeTeam_(result.awayTeam);
      }

      // Update stats
      this.updateTeamStats_(standings[result.homeTeam], result.homeScore, result.awayScore, true);
      this.updateTeamStats_(standings[result.awayTeam], result.awayScore, result.homeScore, false);
    }

    // Convert to array and sort
    const standingsArray = Object.values(standings);

    // Sort by: Points DESC, GD DESC, GF DESC
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Add positions
    standingsArray.forEach((team, index) => {
      team.position = index + 1;
    });

    return standingsArray;
  }

  /**
   * Initialize team object
   */
  initializeTeam_(teamName) {
    return {
      teamName: teamName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0
    };
  }

  /**
   * Update team stats with a result
   */
  updateTeamStats_(team, goalsFor, goalsAgainst, isHome) {
    team.played++;
    team.goalsFor += goalsFor;
    team.goalsAgainst += goalsAgainst;
    team.goalDifference = team.goalsFor - team.goalsAgainst;

    if (goalsFor > goalsAgainst) {
      team.won++;
      team.points += 3;
    } else if (goalsFor === goalsAgainst) {
      team.drawn++;
      team.points += 1;
    } else {
      team.lost++;
    }
  }

  /**
   * Scrape FA official league table
   */
  scrapeFALeagueTable_(competition) {
    if (!this.config.faWebsiteUrl) {
      return null;
    }

    try {
      const tableUrl = this.config.faWebsiteUrl.replace('/fixtures', '/table');
      const response = UrlFetchApp.fetch(tableUrl, { muteHttpExceptions: true });

      if (response.getResponseCode() !== 200) {
        return null;
      }

      const html = response.getContentText();
      const teams = [];

      // Parse table rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let match;

      while ((match = rowRegex.exec(html)) !== null) {
        const rowHtml = match[1];

        // Skip header rows
        if (rowHtml.includes('<th')) {
          continue;
        }

        const team = this.parseTableRow_(rowHtml);
        if (team) {
          teams.push(team);
        }
      }

      return teams;
    } catch (e) {
      Logger.log('FA table scraping failed: ' + e.message);
      return null;
    }
  }

  /**
   * Parse league table row from FA website
   */
  parseTableRow_(html) {
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(html)) !== null) {
      const cellText = this.stripHTML_(cellMatch[1]);
      cells.push(cellText.trim());
    }

    if (cells.length < 6) {
      return null;
    }

    // Common FA table structure: [Pos, Team, P, W, D, L, Pts]
    // Note: GF, GA, GD are NOT in FA table - we calculate these

    return {
      position: parseInt(cells[0]) || 0,
      teamName: cells[1],
      played: parseInt(cells[2]) || 0,
      won: parseInt(cells[3]) || 0,
      drawn: parseInt(cells[4]) || 0,
      lost: parseInt(cells[5]) || 0,
      points: parseInt(cells[6]) || 0,
      source: 'fa_official'
    };
  }

  /**
   * Merge calculated standings with FA official data
   */
  mergeStandings_(calculated, faOfficial) {
    if (!faOfficial || faOfficial.length === 0) {
      // No FA data, use our calculations only
      return calculated;
    }

    // Create lookup map for FA data
    const faMap = {};
    faOfficial.forEach(team => {
      const normalized = this.normalizeTeamName_(team.teamName);
      faMap[normalized] = team;
    });

    // Merge data
    const merged = calculated.map(team => {
      const normalized = this.normalizeTeamName_(team.teamName);
      const faTeam = faMap[normalized];

      if (faTeam) {
        // Use FA official stats (P, W, D, L, Pts, Pos) + our calculated GF/GA/GD
        return {
          teamName: team.teamName,
          position: faTeam.position,
          played: faTeam.played,
          won: faTeam.won,
          drawn: faTeam.drawn,
          lost: faTeam.lost,
          goalsFor: team.goalsFor,
          goalsAgainst: team.goalsAgainst,
          goalDifference: team.goalDifference,
          points: faTeam.points,
          source: 'merged'
        };
      }

      // Not in FA table, use our calculation
      return { ...team, source: 'calculated' };
    });

    // Sort by position
    merged.sort((a, b) => a.position - b.position);

    return merged;
  }

  /**
   * Sync league table to backend
   */
  syncToBackend_(competition, standings) {
    if (!this.config.backendUrl) {
      return { success: false, error: 'No backend URL' };
    }

    try {
      const payload = {
        tenantId: this.config.tenantId || 'default',
        competition: competition,
        standings: standings
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      if (this.config.backendToken) {
        options.headers = {
          'Authorization': 'Bearer ' + this.config.backendToken
        };
      }

      const url = this.config.backendUrl + '/api/v1/league/sync';
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();

      if (responseCode >= 200 && responseCode < 300) {
        return { success: true };
      } else {
        throw new Error('HTTP ' + responseCode + ': ' + response.getContentText());
      }

    } catch (e) {
      Logger.log('Backend sync error: ' + e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Check if all fixtures for today are complete
   */
  areAllTodaysFixturesComplete_() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's fixtures
    const consolidator = new FixtureConsolidator();
    const allFixtures = consolidator.gatherFromEmails_();

    const todaysFixtures = allFixtures.filter(f => {
      const fixtureDate = new Date(f.date);
      fixtureDate.setHours(0, 0, 0, 0);
      return fixtureDate.getTime() === today.getTime() && f.status === 'scheduled';
    });

    // If no fixtures today, don't update
    if (todaysFixtures.length === 0) {
      return false;
    }

    // Check if we have results for all fixtures
    const results = this.gatherAllResults_();
    const todaysResults = results.filter(r => {
      const resultDate = new Date(r.date);
      resultDate.setHours(0, 0, 0, 0);
      return resultDate.getTime() === today.getTime();
    });

    // All fixtures complete if result count >= fixture count
    return todaysResults.length >= todaysFixtures.length;
  }

  // === Helper Methods ===

  deduplicateResults_(results) {
    const seen = new Set();
    const unique = [];

    for (const result of results) {
      const key = this.formatDate_(result.date) + '|' +
                  this.normalizeTeamName_(result.homeTeam) + '|' +
                  this.normalizeTeamName_(result.awayTeam);

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  isOurTeam_(teamName) {
    const normalized = this.normalizeTeamName_(teamName);
    const ourTeam = this.normalizeTeamName_(this.config.teamName);
    return normalized.includes(ourTeam) || ourTeam.includes(normalized);
  }

  normalizeTeamName_(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, ' ').replace(/&/g, 'and').replace(/[^\w\s]/g, '').trim();
  }

  stripHTML_(html) {
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  }

  parseDate_(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    try {
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        return new Date(match[3], match[2] - 1, match[1]);
      }
      return new Date(dateStr);
    } catch (e) {
      return null;
    }
  }

  formatDate_(date) {
    if (!date) return '';
    if (!(date instanceof Date)) date = new Date(date);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return day + '/' + month + '/' + year;
  }

  extractCompetition_(text) {
    const match = text.match(/(Division|League|Cup|Trophy)[^\n]*/i);
    return match ? match[0].trim() : '';
  }
}

/**
 * Global function to calculate league table
 */
function calculateLeagueTable(competition) {
  const calculator = new LeagueTableCalculator();
  return calculator.calculateAndSyncLeagueTable(competition);
}

/**
 * Auto-update trigger function
 * Run this daily to check if all today's fixtures are complete
 */
function autoUpdateLeagueTable() {
  const calculator = new LeagueTableCalculator();

  if (calculator.areAllTodaysFixturesComplete_()) {
    Logger.log('All today\'s fixtures complete - updating league table');
    return calculateLeagueTable();
  } else {
    Logger.log('Not all fixtures complete yet - skipping update');
    return { success: false, reason: 'fixtures_incomplete' };
  }
}

/**
 * Test function
 */
function testLeagueCalculator() {
  const result = calculateLeagueTable();

  Logger.log('=== League Table Calculator Test ===');
  Logger.log('Success: ' + result.success);
  Logger.log('Competition: ' + result.competition);
  Logger.log('Teams: ' + result.teams);
  Logger.log('Synced: ' + result.synced);
}
