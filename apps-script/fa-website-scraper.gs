/**
 * @fileoverview FA Website Scraper - SOURCE 2
 * @version 1.0.0
 * @description Scrapes fixtures and results directly from FA Full-Time website
 */

// ==================== CONFIGURATION ====================

const FA_SCRAPER_CONFIG = {
  // Your team's FA Full-Time page URL
  TEAM_PAGE_URL: null, // Will be set from config

  // Scraping intervals
  CACHE_TTL: 10 * 60, // 10 minutes

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000
};

// ==================== FA WEBSITE SCRAPER CLASS ====================

class FAWebsiteScraper {

  constructor() {
    this.logger = (typeof logger !== 'undefined') ? logger.scope('FAWebsiteScraper') : console;
    this.cache = CacheService.getScriptCache();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Scrape all fixtures from FA website
   * @returns {Array<Object>} Array of fixture objects
   */
  scrapeFixtures() {
    this.logger.info('Starting FA website fixture scrape');

    try {
      const teamUrl = this.getTeamPageUrl();
      if (!teamUrl) {
        this.logger.warn('No FA team page URL configured');
        return [];
      }

      // Check cache first
      const cacheKey = 'fa_scraper_fixtures';
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Returning cached fixtures');
        return JSON.parse(cached);
      }

      // Fetch the page
      const html = this.fetchPageWithRetry(teamUrl);
      if (!html) {
        this.logger.error('Failed to fetch FA team page');
        return [];
      }

      // Parse fixtures from HTML
      const fixtures = this.parseFixturesFromHTML(html);
      this.logger.info(`Scraped ${fixtures.length} fixtures from FA website`);

      // Cache the results
      this.cache.put(cacheKey, JSON.stringify(fixtures), FA_SCRAPER_CONFIG.CACHE_TTL);

      return fixtures;

    } catch (error) {
      this.logger.error('FA website scraping failed', { error: error.toString() });
      return [];
    }
  }

  /**
   * Scrape all results from FA website
   * @returns {Array<Object>} Array of result objects
   */
  scrapeResults() {
    this.logger.info('Starting FA website results scrape');

    try {
      const teamUrl = this.getTeamPageUrl();
      if (!teamUrl) {
        this.logger.warn('No FA team page URL configured');
        return [];
      }

      // Check cache first
      const cacheKey = 'fa_scraper_results';
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Returning cached results');
        return JSON.parse(cached);
      }

      // Fetch the page
      const html = this.fetchPageWithRetry(teamUrl);
      if (!html) {
        this.logger.error('Failed to fetch FA team page');
        return [];
      }

      // Parse results from HTML
      const results = this.parseResultsFromHTML(html);
      this.logger.info(`Scraped ${results.length} results from FA website`);

      // Cache the results
      this.cache.put(cacheKey, JSON.stringify(results), FA_SCRAPER_CONFIG.CACHE_TTL);

      return results;

    } catch (error) {
      this.logger.error('FA results scraping failed', { error: error.toString() });
      return [];
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get team page URL from config
   * @returns {string|null}
   */
  getTeamPageUrl() {
    if (FA_SCRAPER_CONFIG.TEAM_PAGE_URL) {
      return FA_SCRAPER_CONFIG.TEAM_PAGE_URL;
    }

    // Try to get from dynamic config
    if (typeof getConfigValue === 'function') {
      return getConfigValue('FA.TEAM_PAGE_URL', null);
    }

    return null;
  }

  /**
   * Fetch page with retry logic
   * @param {string} url
   * @returns {string|null} HTML content
   */
  fetchPageWithRetry(url) {
    let lastError = null;

    for (let attempt = 1; attempt <= FA_SCRAPER_CONFIG.MAX_RETRIES; attempt++) {
      try {
        this.logger.info(`Fetching FA page (attempt ${attempt}/${FA_SCRAPER_CONFIG.MAX_RETRIES})`);

        const response = UrlFetchApp.fetch(url, {
          method: 'GET',
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.getResponseCode() === 200) {
          return response.getContentText();
        }

        lastError = `HTTP ${response.getResponseCode()}`;
        this.logger.warn(`Fetch attempt ${attempt} failed`, { error: lastError });

      } catch (error) {
        lastError = error.toString();
        this.logger.warn(`Fetch attempt ${attempt} error`, { error: lastError });
      }

      // Wait before retry (except on last attempt)
      if (attempt < FA_SCRAPER_CONFIG.MAX_RETRIES) {
        Utilities.sleep(FA_SCRAPER_CONFIG.RETRY_DELAY_MS);
      }
    }

    this.logger.error('All fetch attempts failed', { lastError });
    return null;
  }

  /**
   * Parse fixtures from HTML
   * @param {string} html
   * @returns {Array<Object>}
   */
  parseFixturesFromHTML(html) {
    const fixtures = [];
    const teamName = this.getOurTeamName();

    try {
      // FA Full-Time uses consistent HTML patterns
      // Look for fixture rows in tables or divs

      // Pattern 1: Table rows with class 'fixture' or 'match'
      const tableMatches = this.extractTableFixtures(html, teamName);
      fixtures.push(...tableMatches);

      // Pattern 2: Div-based layout with data attributes
      const divMatches = this.extractDivFixtures(html, teamName);
      fixtures.push(...divMatches);

      // Pattern 3: JSON data embedded in page
      const jsonMatches = this.extractJSONFixtures(html, teamName);
      fixtures.push(...jsonMatches);

      // Remove duplicates
      const unique = this.deduplicateFixtures(fixtures);

      return unique;

    } catch (error) {
      this.logger.error('HTML parsing failed', { error: error.toString() });
      return [];
    }
  }

  /**
   * Extract fixtures from HTML table
   * @param {string} html
   * @param {string} teamName
   * @returns {Array<Object>}
   */
  extractTableFixtures(html, teamName) {
    const fixtures = [];

    // Match fixture rows: date, home team, score/time, away team, competition
    const rowPattern = /<tr[^>]*class="[^"]*(?:fixture|match|upcoming)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = html.match(rowPattern) || [];

    for (const row of rows) {
      try {
        // Extract date
        const dateMatch = row.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        const date = dateMatch ? dateMatch[1] : null;

        // Extract teams
        const teamPattern = /<td[^>]*class="[^"]*(?:team|club)[^"]*"[^>]*>([^<]+)<\/td>/gi;
        const teams = [];
        let teamMatch;
        while ((teamMatch = teamPattern.exec(row)) !== null) {
          teams.push(this.cleanText(teamMatch[1]));
        }

        if (teams.length >= 2 && date) {
          const homeTeam = teams[0];
          const awayTeam = teams[1];

          // Only include matches involving our team
          if (this.isOurMatch(homeTeam, awayTeam, teamName)) {
            // Extract time
            const timeMatch = row.match(/(\d{1,2}:\d{2})/);
            const time = timeMatch ? timeMatch[1] : '15:00';

            // Extract competition
            const compMatch = row.match(/(?:competition|league|cup)[^>]*>([^<]+)<\/td>/i);
            const competition = compMatch ? this.cleanText(compMatch[1]) : 'League';

            // Extract venue
            const venueMatch = row.match(/(?:venue|ground)[^>]*>([^<]+)<\/td>/i);
            const venue = venueMatch ? this.cleanText(venueMatch[1]) : '';

            fixtures.push({
              date: date,
              time: time,
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              opponent: homeTeam === teamName ? awayTeam : homeTeam,
              venue: this.determineVenue(homeTeam, awayTeam, venue, teamName),
              competition: competition,
              status: 'scheduled',
              source: 'fa_website'
            });
          }
        }
      } catch (error) {
        // Skip malformed rows
        continue;
      }
    }

    return fixtures;
  }

  /**
   * Extract fixtures from div-based layout
   * @param {string} html
   * @param {string} teamName
   * @returns {Array<Object>}
   */
  extractDivFixtures(html, teamName) {
    const fixtures = [];

    // Look for divs with data-match or data-fixture attributes
    const divPattern = /<div[^>]*(?:data-match|data-fixture)[^>]*>([\s\S]*?)<\/div>/gi;
    const divs = html.match(divPattern) || [];

    for (const div of divs) {
      try {
        // Extract data attributes
        const dateMatch = div.match(/data-date="([^"]+)"/);
        const homeMatch = div.match(/data-home="([^"]+)"/);
        const awayMatch = div.match(/data-away="([^"]+)"/);
        const timeMatch = div.match(/data-time="([^"]+)"/);
        const compMatch = div.match(/data-competition="([^"]+)"/);

        if (dateMatch && homeMatch && awayMatch) {
          const homeTeam = this.cleanText(homeMatch[1]);
          const awayTeam = this.cleanText(awayMatch[1]);

          if (this.isOurMatch(homeTeam, awayTeam, teamName)) {
            fixtures.push({
              date: dateMatch[1],
              time: timeMatch ? timeMatch[1] : '15:00',
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              opponent: homeTeam === teamName ? awayTeam : homeTeam,
              venue: this.determineVenue(homeTeam, awayTeam, '', teamName),
              competition: compMatch ? this.cleanText(compMatch[1]) : 'League',
              status: 'scheduled',
              source: 'fa_website'
            });
          }
        }
      } catch (error) {
        continue;
      }
    }

    return fixtures;
  }

  /**
   * Extract fixtures from embedded JSON
   * @param {string} html
   * @param {string} teamName
   * @returns {Array<Object>}
   */
  extractJSONFixtures(html, teamName) {
    const fixtures = [];

    try {
      // Look for JSON data in script tags
      const jsonPattern = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
      const scripts = html.match(jsonPattern) || [];

      for (const script of scripts) {
        const jsonMatch = script.match(/>([\s\S]*?)<\/script>/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);

            // Look for fixtures array in various possible locations
            const fixtureArrays = [
              data.fixtures,
              data.matches,
              data.upcoming,
              data.results && data.results.fixtures
            ].filter(Boolean);

            for (const fixtureArray of fixtureArrays) {
              if (Array.isArray(fixtureArray)) {
                for (const fixture of fixtureArray) {
                  if (this.isOurMatch(fixture.homeTeam, fixture.awayTeam, teamName)) {
                    fixtures.push({
                      date: fixture.date || fixture.matchDate,
                      time: fixture.time || fixture.kickOff || '15:00',
                      homeTeam: fixture.homeTeam,
                      awayTeam: fixture.awayTeam,
                      opponent: fixture.homeTeam === teamName ? fixture.awayTeam : fixture.homeTeam,
                      venue: this.determineVenue(fixture.homeTeam, fixture.awayTeam, fixture.venue, teamName),
                      competition: fixture.competition || 'League',
                      status: fixture.status || 'scheduled',
                      source: 'fa_website'
                    });
                  }
                }
              }
            }
          } catch (jsonError) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    } catch (error) {
      this.logger.warn('JSON extraction failed', { error: error.toString() });
    }

    return fixtures;
  }

  /**
   * Parse results from HTML
   * @param {string} html
   * @returns {Array<Object>}
   */
  parseResultsFromHTML(html) {
    const results = [];
    const teamName = this.getOurTeamName();

    try {
      // Look for completed match rows
      const rowPattern = /<tr[^>]*class="[^"]*(?:result|completed|played)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows = html.match(rowPattern) || [];

      for (const row of rows) {
        try {
          // Extract date
          const dateMatch = row.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          const date = dateMatch ? dateMatch[1] : null;

          // Extract teams
          const teamPattern = /<td[^>]*class="[^"]*(?:team|club)[^"]*"[^>]*>([^<]+)<\/td>/gi;
          const teams = [];
          let teamMatch;
          while ((teamMatch = teamPattern.exec(row)) !== null) {
            teams.push(this.cleanText(teamMatch[1]));
          }

          // Extract score
          const scoreMatch = row.match(/(\d+)\s*[-:]\s*(\d+)/);

          if (teams.length >= 2 && date && scoreMatch) {
            const homeTeam = teams[0];
            const awayTeam = teams[1];
            const homeScore = parseInt(scoreMatch[1]);
            const awayScore = parseInt(scoreMatch[2]);

            if (this.isOurMatch(homeTeam, awayTeam, teamName)) {
              results.push({
                date: date,
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                opponent: homeTeam === teamName ? awayTeam : homeTeam,
                homeScore: homeScore,
                awayScore: awayScore,
                venue: homeTeam === teamName ? 'Home' : 'Away',
                source: 'fa_website'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      this.logger.error('Results parsing failed', { error: error.toString() });
    }

    return results;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get our team name
   * @returns {string}
   */
  getOurTeamName() {
    if (typeof getDynamicConfig === 'function') {
      const dynamicConfig = getDynamicConfig();
      if (dynamicConfig && dynamicConfig.TEAM_NAME) {
        return dynamicConfig.TEAM_NAME;
      }
    }

    if (typeof getConfigValue === 'function') {
      return getConfigValue('SYSTEM.CLUB_NAME', 'Your Football Club');
    }

    return 'Your Football Club';
  }

  /**
   * Check if match involves our team
   * @param {string} homeTeam
   * @param {string} awayTeam
   * @param {string} ourTeam
   * @returns {boolean}
   */
  isOurMatch(homeTeam, awayTeam, ourTeam) {
    const home = homeTeam.toLowerCase();
    const away = awayTeam.toLowerCase();
    const our = ourTeam.toLowerCase();

    return home.includes(our) || away.includes(our) ||
           our.includes(home) || our.includes(away);
  }

  /**
   * Determine venue (Home/Away)
   * @param {string} homeTeam
   * @param {string} awayTeam
   * @param {string} venueName
   * @param {string} ourTeam
   * @returns {string}
   */
  determineVenue(homeTeam, awayTeam, venueName, ourTeam) {
    if (this.isOurMatch(homeTeam, '', ourTeam)) {
      return venueName || 'Home';
    }
    return venueName || 'Away';
  }

  /**
   * Clean text (remove HTML, trim, normalize)
   * @param {string} text
   * @returns {string}
   */
  cleanText(text) {
    return text
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Deduplicate fixtures by date + opponent
   * @param {Array<Object>} fixtures
   * @returns {Array<Object>}
   */
  deduplicateFixtures(fixtures) {
    const seen = new Set();
    const unique = [];

    for (const fixture of fixtures) {
      const key = `${fixture.date}|${fixture.opponent}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(fixture);
      }
    }

    return unique;
  }
}

// ==================== GLOBAL FUNCTIONS ====================

/**
 * Scrape fixtures from FA website (global function)
 * @returns {Array<Object>}
 */
function scrapeFAFixtures() {
  const scraper = new FAWebsiteScraper();
  return scraper.scrapeFixtures();
}

/**
 * Scrape results from FA website (global function)
 * @returns {Array<Object>}
 */
function scrapeFAResults() {
  const scraper = new FAWebsiteScraper();
  return scraper.scrapeResults();
}

/**
 * Test FA website scraper
 * @returns {Object}
 */
function testFAWebsiteScraper() {
  console.log('🧪 Testing FA Website Scraper...');

  try {
    const scraper = new FAWebsiteScraper();

    console.log('\n📥 Scraping fixtures...');
    const fixtures = scraper.scrapeFixtures();
    console.log(`✅ Found ${fixtures.length} fixtures`);

    if (fixtures.length > 0) {
      console.log('\nSample fixture:');
      console.log(JSON.stringify(fixtures[0], null, 2));
    }

    console.log('\n📥 Scraping results...');
    const results = scraper.scrapeResults();
    console.log(`✅ Found ${results.length} results`);

    if (results.length > 0) {
      console.log('\nSample result:');
      console.log(JSON.stringify(results[0], null, 2));
    }

    return {
      success: true,
      fixtures_count: fixtures.length,
      results_count: results.length,
      fixtures: fixtures,
      results: results
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}
