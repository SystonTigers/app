/**
 * Fixture Consolidator
 * Combines fixtures from all 3 sources (Email, Website, Snippet)
 * Deduplicates, updates Google Sheets, and syncs to backend
 */

class FixtureConsolidator {
  constructor() {
    this.config = this.loadConfig_();
    this.sheet = this.getFixturesSheet_();
  }

  /**
   * Load configuration from backend API
   */
  loadConfig_() {
    const props = PropertiesService.getScriptProperties();
    const backendUrl = props.getProperty('BACKEND_API_URL') || '';
    const backendToken = props.getProperty('BACKEND_API_TOKEN') || '';
    const tenantId = props.getProperty('TENANT_ID') || 'default';

    if (!backendUrl) {
      Logger.log('WARNING: No BACKEND_API_URL set in Script Properties');
      return {
        backendUrl: '',
        backendToken: '',
        tenantId: 'default',
        teamName: 'Shepshed Dynamo Youth U16',
        faWebsiteUrl: '',
        faSnippetUrl: '',
        syncEnabled: true,
        sheetName: 'Fixtures'
      };
    }

    // Fetch configuration from backend
    try {
      const configUrl = backendUrl + '/api/v1/fixtures/settings/config?tenant_id=' + tenantId;
      const response = UrlFetchApp.fetch(configUrl, {
        muteHttpExceptions: true,
        headers: backendToken ? { 'Authorization': 'Bearer ' + backendToken } : {}
      });

      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        if (data.success && data.data) {
          return {
            backendUrl: backendUrl,
            backendToken: backendToken,
            tenantId: data.data.tenantId || 'default',
            teamName: data.data.teamName || 'Shepshed Dynamo Youth U16',
            faWebsiteUrl: data.data.faWebsiteUrl || '',
            faSnippetUrl: data.data.faSnippetUrl || '',
            syncEnabled: data.data.syncEnabled !== false,
            calendarId: data.data.calendarId || '',
            sheetName: 'Fixtures'
          };
        }
      }

      Logger.log('Failed to fetch config from backend: HTTP ' + response.getResponseCode());
    } catch (e) {
      Logger.log('Error fetching config from backend: ' + e.message);
    }

    // Fallback to defaults
    return {
      backendUrl: backendUrl,
      backendToken: backendToken,
      tenantId: tenantId,
      teamName: 'Shepshed Dynamo Youth U16',
      faWebsiteUrl: '',
      faSnippetUrl: '',
      syncEnabled: true,
      sheetName: 'Fixtures'
    };
  }

  /**
   * Get or create Fixtures sheet
   */
  getFixturesSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(this.config.sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(this.config.sheetName);
      this.initializeSheet_(sheet);
    }

    return sheet;
  }

  /**
   * Initialize sheet with headers
   */
  initializeSheet_(sheet) {
    const headers = [
      'Date',
      'Opponent',
      'Venue',
      'Competition',
      'Kick-off Time',
      'Status',
      'Source',
      'Last Updated'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  /**
   * Main consolidation function
   */
  consolidateFixtures() {
    Logger.log('=== Starting Fixture Consolidation ===');

    try {
      // Step 1: Gather from all sources
      const fromEmails = this.gatherFromEmails_();
      const fromWebsite = this.gatherFromWebsite_();
      const fromSnippet = this.gatherFromSnippet_();

      Logger.log('SOURCE 1 (Emails): ' + fromEmails.length + ' fixtures');
      Logger.log('SOURCE 2 (Website): ' + fromWebsite.length + ' fixtures');
      Logger.log('SOURCE 3 (Snippet): ' + fromSnippet.length + ' fixtures');

      // Step 2: Combine all sources
      const allFixtures = [...fromEmails, ...fromWebsite, ...fromSnippet];
      Logger.log('Total before deduplication: ' + allFixtures.length);

      // Step 3: Deduplicate
      const uniqueFixtures = this.deduplicateFixtures_(allFixtures);
      Logger.log('Total after deduplication: ' + uniqueFixtures.length);

      // Step 4: Update Google Sheets
      const sheetResult = this.updateFixturesSheet_(uniqueFixtures);
      Logger.log('Updated Google Sheets: ' + sheetResult.updated + ' rows');

      // Step 5: Sync to backend
      const backendResult = this.syncToBackend_(uniqueFixtures);
      Logger.log('Synced to backend: ' + (backendResult.success ? 'SUCCESS' : 'FAILED'));

      return {
        success: true,
        totalFixtures: uniqueFixtures.length,
        sources: {
          emails: fromEmails.length,
          website: fromWebsite.length,
          snippet: fromSnippet.length
        },
        sheetUpdated: sheetResult.updated,
        backendSynced: backendResult.success
      };

    } catch (e) {
      Logger.log('ERROR: ' + e.message);
      Logger.log(e.stack);
      return {
        success: false,
        error: e.message
      };
    }
  }

  /**
   * Gather fixtures from emails (SOURCE 1)
   */
  gatherFromEmails_() {
    try {
      // Use existing FA email parser from FA-Fixture-Sync-FIXED.gs
      // This assumes parseAllFAEmails() exists and returns array of fixtures

      if (typeof parseAllFAEmails === 'function') {
        return parseAllFAEmails();
      }

      // Fallback: Search Gmail and parse
      return this.parseEmailsManually_();

    } catch (e) {
      Logger.log('Email parsing error: ' + e.message);
      return [];
    }
  }

  /**
   * Fallback email parsing
   */
  parseEmailsManually_() {
    const fixtures = [];
    const threads = GmailApp.search('from:@thefa.com subject:(fixture OR postponed)', 0, 50);

    for (const thread of threads) {
      const messages = thread.getMessages();
      for (const message of messages) {
        const parsed = this.parseEmailMessage_(message);
        fixtures.push(...parsed);
      }
    }

    return fixtures;
  }

  /**
   * Parse single email message
   */
  parseEmailMessage_(message) {
    // Basic parsing - extract date, teams, competition
    const body = message.getPlainBody();
    const subject = message.getSubject();
    const fixtures = [];

    // Look for postponement
    const isPostponed = /postpone|cancel/i.test(subject) || /postpone|cancel/i.test(body);

    // Extract date pattern: DD/MM/YYYY
    const dateMatches = body.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g);
    if (!dateMatches) return fixtures;

    for (const dateStr of dateMatches) {
      const fixture = {
        date: this.parseDate_(dateStr),
        opponent: this.extractOpponent_(body),
        venue: this.extractVenue_(body),
        competition: this.extractCompetition_(body),
        kickOffTime: this.extractTime_(body),
        status: isPostponed ? 'postponed' : 'scheduled',
        source: 'email'
      };

      if (fixture.date && fixture.opponent) {
        fixtures.push(fixture);
      }
    }

    return fixtures;
  }

  /**
   * Gather fixtures from website (SOURCE 2)
   */
  gatherFromWebsite_() {
    try {
      if (typeof scrapeFAWebsite === 'function') {
        return scrapeFAWebsite();
      }

      // Use the scraper class
      const scraper = new FAWebsiteScraper();
      return scraper.scrapeFixtures();

    } catch (e) {
      Logger.log('Website scraping error: ' + e.message);
      return [];
    }
  }

  /**
   * Gather fixtures from snippet (SOURCE 3)
   */
  gatherFromSnippet_() {
    try {
      if (typeof parseFASnippet === 'function') {
        return parseFASnippet();
      }

      // Use the parser class
      const parser = new FASnippetParser();
      return parser.parseSnippet();

    } catch (e) {
      Logger.log('Snippet parsing error: ' + e.message);
      return [];
    }
  }

  /**
   * Deduplicate fixtures by date + opponent
   */
  deduplicateFixtures_(fixtures) {
    const fixtureMap = new Map();

    for (const fixture of fixtures) {
      if (!fixture.date || !fixture.opponent) continue;

      // Create unique key: date + normalized opponent
      const dateKey = this.formatDate_(fixture.date);
      const opponentKey = this.normalizeTeamName_(fixture.opponent);
      const key = dateKey + '|' + opponentKey;

      if (!fixtureMap.has(key)) {
        fixtureMap.set(key, fixture);
      } else {
        // Merge with existing - prefer more complete data
        const existing = fixtureMap.get(key);
        const merged = this.mergeFixtures_(existing, fixture);
        fixtureMap.set(key, merged);
      }
    }

    // Convert back to array and sort by date
    const uniqueFixtures = Array.from(fixtureMap.values());
    uniqueFixtures.sort((a, b) => a.date - b.date);

    return uniqueFixtures;
  }

  /**
   * Merge two fixture objects - prefer most complete data
   */
  mergeFixtures_(fixture1, fixture2) {
    return {
      date: fixture1.date || fixture2.date,
      opponent: fixture1.opponent || fixture2.opponent,
      venue: fixture1.venue || fixture2.venue,
      competition: fixture1.competition || fixture2.competition,
      kickOffTime: fixture1.kickOffTime || fixture2.kickOffTime,
      status: this.mergeStatus_(fixture1.status, fixture2.status),
      source: this.mergeSources_(fixture1.source, fixture2.source)
    };
  }

  /**
   * Merge status - prefer postponed over scheduled
   */
  mergeStatus_(status1, status2) {
    if (status1 === 'postponed' || status2 === 'postponed') {
      return 'postponed';
    }
    if (status1 === 'completed' || status2 === 'completed') {
      return 'completed';
    }
    return 'scheduled';
  }

  /**
   * Merge sources
   */
  mergeSources_(source1, source2) {
    if (source1 === source2) return source1;
    return source1 + '+' + source2;
  }

  /**
   * Update Google Sheets with fixtures
   */
  updateFixturesSheet_(fixtures) {
    // Clear existing data (keep headers)
    const lastRow = this.sheet.getLastRow();
    if (lastRow > 1) {
      this.sheet.getRange(2, 1, lastRow - 1, 8).clear();
    }

    if (fixtures.length === 0) {
      return { updated: 0 };
    }

    // Convert fixtures to rows
    const rows = fixtures.map(f => [
      this.formatDate_(f.date),
      f.opponent,
      f.venue,
      f.competition,
      f.kickOffTime,
      f.status,
      f.source,
      new Date()
    ]);

    // Write to sheet
    this.sheet.getRange(2, 1, rows.length, 8).setValues(rows);

    // Format dates
    this.sheet.getRange(2, 1, rows.length, 1).setNumberFormat('dd/mm/yyyy');

    return { updated: rows.length };
  }

  /**
   * Sync fixtures to Cloudflare Worker backend
   */
  syncToBackend_(fixtures) {
    if (!this.config.backendUrl) {
      Logger.log('No backend URL configured - skipping sync');
      return { success: false, error: 'No backend URL' };
    }

    try {
      const payload = {
        fixtures: fixtures.map(f => ({
          date: this.formatDate_(f.date),
          opponent: f.opponent,
          venue: f.venue,
          competition: f.competition,
          time: f.kickOffTime,
          status: f.status,
          source: f.source
        }))
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

      const url = this.config.backendUrl + '/v1/fixtures/sync';
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();

      if (responseCode >= 200 && responseCode < 300) {
        const result = JSON.parse(response.getContentText());
        return { success: true, synced: result.synced || fixtures.length };
      } else {
        throw new Error('HTTP ' + responseCode + ': ' + response.getContentText());
      }

    } catch (e) {
      Logger.log('Backend sync error: ' + e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Helper: Parse date
   */
  parseDate_(dateStr) {
    if (dateStr instanceof Date) return dateStr;
    if (!dateStr) return null;

    try {
      // Try DD/MM/YYYY format
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JS months are 0-indexed
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      }

      return new Date(dateStr);
    } catch (e) {
      return null;
    }
  }

  /**
   * Helper: Format date as DD/MM/YYYY
   */
  formatDate_(date) {
    if (!date) return '';
    if (!(date instanceof Date)) date = new Date(date);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return day + '/' + month + '/' + year;
  }

  /**
   * Helper: Normalize team name
   */
  normalizeTeamName_(name) {
    if (!name) return '';

    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/&/g, 'and')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Helper: Extract opponent from email body
   */
  extractOpponent_(body) {
    // Look for "vs" or "against" patterns
    const vsMatch = body.match(/(?:vs|against)\s+([A-Za-z\s&]+?)(?:\s+U\d+)?(?:\n|$)/i);
    if (vsMatch) {
      return vsMatch[1].trim();
    }
    return '';
  }

  /**
   * Helper: Extract venue from email body
   */
  extractVenue_(body) {
    if (/\b(home)\b/i.test(body)) return 'Home';
    if (/\b(away)\b/i.test(body)) return 'Away';
    return '';
  }

  /**
   * Helper: Extract competition from email body
   */
  extractCompetition_(body) {
    const compMatch = body.match(/Competition:\s*(.+)/i);
    if (compMatch) {
      return compMatch[1].trim();
    }
    return '';
  }

  /**
   * Helper: Extract time from email body
   */
  extractTime_(body) {
    const timeMatch = body.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
    if (timeMatch) {
      return timeMatch[0];
    }
    return '';
  }
}

/**
 * Global function to consolidate fixtures
 */
function consolidateFixtures() {
  const consolidator = new FixtureConsolidator();
  return consolidator.consolidateFixtures();
}

/**
 * Test function
 */
function testFixtureConsolidator() {
  const result = consolidateFixtures();

  Logger.log('=== Fixture Consolidation Test ===');
  Logger.log('Success: ' + result.success);
  Logger.log('Total Fixtures: ' + result.totalFixtures);
  Logger.log('Email: ' + result.sources.emails);
  Logger.log('Website: ' + result.sources.website);
  Logger.log('Snippet: ' + result.sources.snippet);
  Logger.log('Sheet Updated: ' + result.sheetUpdated);
  Logger.log('Backend Synced: ' + result.backendSynced);
}
