/**
 * FA Snippet Parser - SOURCE 3
 * Parses fixtures from FA Full-Time embed/snippet code
 *
 * Usage:
 *   const parser = new FASnippetParser();
 *   const fixtures = parser.parseSnippet();
 */

class FASnippetParser {
  constructor() {
    this.config = this.loadConfig_();
    this.cache = CacheService.getScriptCache();
    this.cacheKey = 'fa_snippet_fixtures';
    this.cacheTTL = 600; // 10 minutes
  }

  /**
   * Load configuration from Script Properties
   */
  loadConfig_() {
    const props = PropertiesService.getScriptProperties();
    return {
      snippetUrl: props.getProperty('FA_SNIPPET_URL') || '',
      teamName: props.getProperty('TEAM_NAME') || 'Shepshed Dynamo Youth U16',
      retryAttempts: 3,
      retryDelay: 2000
    };
  }

  /**
   * Main entry point - Parse fixtures from FA snippet
   */
  parseSnippet() {
    // Check cache first
    const cached = this.getCachedFixtures_();
    if (cached) {
      Logger.log('[FA Snippet] Using cached fixtures');
      return cached;
    }

    if (!this.config.snippetUrl) {
      Logger.log('[FA Snippet] No snippet URL configured - skipping');
      return [];
    }

    try {
      Logger.log('[FA Snippet] Fetching from: ' + this.config.snippetUrl);

      const content = this.fetchSnippetWithRetry_();
      const fixtures = this.parseSnippetContent_(content);

      Logger.log('[FA Snippet] Found ' + fixtures.length + ' fixtures');

      // Cache the results
      this.cacheFixtures_(fixtures);

      return fixtures;
    } catch (e) {
      Logger.log('[FA Snippet] Error: ' + e.message);
      return [];
    }
  }

  /**
   * Fetch snippet content with retry logic
   */
  fetchSnippetWithRetry_() {
    let lastError;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = UrlFetchApp.fetch(this.config.snippetUrl, {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.getResponseCode() === 200) {
          return response.getContentText();
        }

        throw new Error('HTTP ' + response.getResponseCode());
      } catch (e) {
        lastError = e;
        Logger.log('[FA Snippet] Attempt ' + attempt + ' failed: ' + e.message);

        if (attempt < this.config.retryAttempts) {
          Utilities.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse snippet content (supports multiple formats)
   */
  parseSnippetContent_(content) {
    const fixtures = [];

    // Strategy 1: Try parsing as JSON
    const jsonMatches = this.parseAsJSON_(content);
    fixtures.push(...jsonMatches);

    // Strategy 2: Try parsing embedded iframe/script
    const iframeMatches = this.parseEmbeddedIframe_(content);
    fixtures.push(...iframeMatches);

    // Strategy 3: Try parsing HTML table
    const tableMatches = this.parseHTMLTable_(content);
    fixtures.push(...tableMatches);

    // Deduplicate
    return this.deduplicateFixtures_(fixtures);
  }

  /**
   * Parse JSON format
   */
  parseAsJSON_(content) {
    const fixtures = [];

    try {
      // Try parsing direct JSON
      let data;
      try {
        data = JSON.parse(content);
      } catch (e) {
        // Try extracting JSON from script tag
        const jsonMatch = content.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[1]);
        } else {
          return fixtures;
        }
      }

      // Common JSON structures
      const fixtureArray = data.fixtures || data.matches || data.events || data;

      if (!Array.isArray(fixtureArray)) {
        return fixtures;
      }

      for (const item of fixtureArray) {
        const fixture = this.parseJSONFixture_(item);
        if (fixture) {
          fixtures.push(fixture);
        }
      }
    } catch (e) {
      // Not valid JSON, continue to next strategy
    }

    return fixtures;
  }

  /**
   * Parse individual JSON fixture object
   */
  parseJSONFixture_(item) {
    try {
      // Common field names used by FA
      const date = item.date || item.matchDate || item.fixtureDate || item.kickoffTime;
      const homeTeam = item.homeTeam || item.home || item.homeClub;
      const awayTeam = item.awayTeam || item.away || item.awayClub;
      const competition = item.competition || item.league || item.division || '';
      const venue = item.venue || item.ground || '';
      const kickOff = item.kickOff || item.time || '';
      const status = item.status || 'scheduled';

      if (!date || (!homeTeam && !awayTeam)) {
        return null;
      }

      // Determine if our team is involved
      const teamName = this.config.teamName;
      const isHomeMatch = this.isTeamMatch_(homeTeam, teamName);
      const isAwayMatch = this.isTeamMatch_(awayTeam, teamName);

      if (!isHomeMatch && !isAwayMatch) {
        return null;
      }

      return {
        date: this.parseDate_(date),
        opponent: isHomeMatch ? awayTeam : homeTeam,
        venue: isHomeMatch ? 'Home' : 'Away',
        competition: this.cleanText_(competition),
        kickOffTime: this.parseTime_(kickOff),
        status: this.normalizeStatus_(status),
        source: 'snippet'
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Parse embedded iframe content
   */
  parseEmbeddedIframe_(content) {
    const fixtures = [];

    // Extract iframe src
    const iframeMatch = content.match(/<iframe[^>]*src=["']([^"']+)["']/i);
    if (!iframeMatch) {
      return fixtures;
    }

    const iframeSrc = iframeMatch[1];

    try {
      // Fetch iframe content
      const iframeResponse = UrlFetchApp.fetch(iframeSrc, {
        muteHttpExceptions: true,
        followRedirects: true
      });

      if (iframeResponse.getResponseCode() === 200) {
        const iframeHtml = iframeResponse.getContentText();

        // Try parsing iframe content as JSON or HTML
        fixtures.push(...this.parseAsJSON_(iframeHtml));
        fixtures.push(...this.parseHTMLTable_(iframeHtml));
      }
    } catch (e) {
      Logger.log('[FA Snippet] Iframe fetch failed: ' + e.message);
    }

    return fixtures;
  }

  /**
   * Parse HTML table format
   */
  parseHTMLTable_(html) {
    const fixtures = [];

    // Match table rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1];

      // Skip header rows
      if (rowHtml.includes('<th')) {
        continue;
      }

      // Extract cells
      const cells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const cellText = this.stripHTML_(cellMatch[1]);
        cells.push(cellText.trim());
      }

      if (cells.length < 3) {
        continue;
      }

      // Common table structures:
      // [Date, Home Team, Away Team, Venue, Competition, Time]
      // [Date, Opponent, Venue, Time]
      // [Competition, Date, Home, Away, Time, Venue]

      const fixture = this.parseTableRow_(cells);
      if (fixture) {
        fixtures.push(fixture);
      }
    }

    return fixtures;
  }

  /**
   * Parse table row cells into fixture object
   */
  parseTableRow_(cells) {
    const teamName = this.config.teamName;

    // Try different cell arrangements
    for (let i = 0; i < cells.length - 2; i++) {
      const possibleDate = cells[i];
      const possibleTeam1 = cells[i + 1];
      const possibleTeam2 = cells[i + 2];

      // Check if first cell looks like a date
      if (!this.looksLikeDate_(possibleDate)) {
        continue;
      }

      // Check if either team matches our team
      const isTeam1Match = this.isTeamMatch_(possibleTeam1, teamName);
      const isTeam2Match = this.isTeamMatch_(possibleTeam2, teamName);

      if (!isTeam1Match && !isTeam2Match) {
        continue;
      }

      return {
        date: this.parseDate_(possibleDate),
        opponent: isTeam1Match ? possibleTeam2 : possibleTeam1,
        venue: isTeam1Match ? 'Away' : 'Home',
        competition: cells[i + 3] || '',
        kickOffTime: this.findTime_(cells),
        status: 'scheduled',
        source: 'snippet'
      };
    }

    return null;
  }

  /**
   * Helper: Check if text looks like a date
   */
  looksLikeDate_(text) {
    return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text);
  }

  /**
   * Helper: Find time in cells
   */
  findTime_(cells) {
    for (const cell of cells) {
      const timeMatch = cell.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
      if (timeMatch) {
        return timeMatch[0];
      }
    }
    return '';
  }

  /**
   * Helper: Parse date string
   */
  parseDate_(dateStr) {
    if (!dateStr) return null;

    try {
      // Try various date formats
      const formats = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY or MM/DD/YYYY
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY-MM-DD
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          return new Date(dateStr);
        }
      }

      // Fallback to Date.parse
      return new Date(dateStr);
    } catch (e) {
      return null;
    }
  }

  /**
   * Helper: Parse time string
   */
  parseTime_(timeStr) {
    if (!timeStr) return '';

    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (match) {
      return match[0];
    }

    return '';
  }

  /**
   * Helper: Normalize status
   */
  normalizeStatus_(status) {
    const lower = status.toLowerCase();

    if (lower.includes('cancel') || lower.includes('postpone')) {
      return 'postponed';
    }
    if (lower.includes('complete') || lower.includes('finish')) {
      return 'completed';
    }

    return 'scheduled';
  }

  /**
   * Helper: Check if team name matches
   */
  isTeamMatch_(teamStr, targetTeam) {
    if (!teamStr || !targetTeam) return false;

    const normalized1 = this.normalizeTeamName_(teamStr);
    const normalized2 = this.normalizeTeamName_(targetTeam);

    return normalized1 === normalized2 ||
           normalized1.includes(normalized2) ||
           normalized2.includes(normalized1);
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
   * Helper: Strip HTML tags
   */
  stripHTML_(html) {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Helper: Clean text
   */
  cleanText_(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Deduplicate fixtures by date + opponent
   */
  deduplicateFixtures_(fixtures) {
    const seen = new Set();
    const unique = [];

    for (const fixture of fixtures) {
      if (!fixture.date || !fixture.opponent) continue;

      const key = fixture.date.toISOString().split('T')[0] + '|' +
                  this.normalizeTeamName_(fixture.opponent);

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(fixture);
      }
    }

    return unique;
  }

  /**
   * Get cached fixtures
   */
  getCachedFixtures_() {
    const cached = this.cache.get(this.cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Cache fixtures
   */
  cacheFixtures_(fixtures) {
    try {
      this.cache.put(this.cacheKey, JSON.stringify(fixtures), this.cacheTTL);
    } catch (e) {
      Logger.log('[FA Snippet] Cache write failed: ' + e.message);
    }
  }
}

/**
 * Global function to parse FA snippet
 */
function parseFASnippet() {
  const parser = new FASnippetParser();
  return parser.parseSnippet();
}

/**
 * Test function
 */
function testFASnippetParser() {
  const fixtures = parseFASnippet();

  Logger.log('=== FA Snippet Parser Test ===');
  Logger.log('Found ' + fixtures.length + ' fixtures');

  for (const fixture of fixtures) {
    Logger.log('');
    Logger.log('Date: ' + fixture.date);
    Logger.log('Opponent: ' + fixture.opponent);
    Logger.log('Venue: ' + fixture.venue);
    Logger.log('Competition: ' + fixture.competition);
    Logger.log('Kick-off: ' + fixture.kickOffTime);
    Logger.log('Status: ' + fixture.status);
  }
}
