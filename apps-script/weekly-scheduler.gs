/**
 * @fileoverview Bible-Compliant Weekly Content Calendar Automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Implements the exact Monday-Sunday content schedule from the system workings Bible
 * 
 * CREATE NEW FILE - This is the core Bible-compliant weekly scheduler
 * 
 * WEEKLY SCHEDULE (BIBLE COMPLIANCE):
 * Monday: This week's fixtures / no match scheduled
 * Tuesday: Quotes 
 * Wednesday: Player stats (Monthly) / Previous matches vs opponent
 * Thursday: Throwback Thursday / 3 days to go
 * Friday: 2 days to go
 * Saturday: 1 day to go  
 * Sunday: MATCH DAY
 */

// ==================== WEEKLY SCHEDULER CLASS ====================

/**
 * Weekly Scheduler Class - Bible-compliant implementation
 */
class WeeklyScheduler {
  
  constructor() {
    this.loggerName = 'WeeklyScheduler';
    this._logger = null;
    this.makeIntegration = new MakeIntegration();
    this.today = DateUtils.now();
    this.dayOfWeek = DateUtils.getDayOfWeek(this.today); // 0=Sunday, 1=Monday, etc.
    this.variantBuilderAvailable = typeof buildTemplateVariantCollection === 'function';
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${this.loggerName}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  // ==================== MAIN SCHEDULE RUNNER ====================

  /**
   * Run weekly schedule automation (Bible compliance)
   * @param {boolean} forceRun - Force run regardless of day
   * @returns {Object} Execution result
   */
  runWeeklySchedule(forceRun = false) {
    this.logger.enterFunction('runWeeklySchedule', { forceRun, dayOfWeek: this.dayOfWeek });
    
    try {
      // @testHook(weekly_schedule_start)
      
      // Check if weekly schedule is enabled
      if (!getConfigValue('WEEKLY_SCHEDULE.ENABLED', true)) {
        return { success: true, message: 'Weekly schedule disabled', skipped: true };
      }
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[this.dayOfWeek];
      
      this.logger.info(`Running weekly schedule for ${todayName}`, { 
        day_of_week: this.dayOfWeek,
        force_run: forceRun
      });
      
      let result;
      
      // Bible-compliant weekly schedule
      switch (this.dayOfWeek) {
        case 1: // Monday
          result = this.postMondayFixtures();
          break;
        case 2: // Tuesday  
          result = this.postTuesdayQuotes();
          break;
        case 3: // Wednesday
          result = this.postWednesdayStats();
          break;
        case 4: // Thursday
          result = this.postThursdayThrowback();
          break;
        case 5: // Friday
          result = this.postFridayCountdown();
          break;
        case 6: // Saturday
          result = this.postSaturdayCountdown();
          break;
        case 0: // Sunday
          result = this.handleMatchDay();
          break;
        default:
          result = { success: false, error: 'Invalid day of week' };
      }
      
      // @testHook(weekly_schedule_complete)
      
      this.logger.exitFunction('runWeeklySchedule', { 
        success: result.success,
        day: todayName
      });
      
      return {
        ...result,
        day_of_week: this.dayOfWeek,
        day_name: todayName,
        executed_at: DateUtils.formatISO(this.today)
      };
      
    } catch (error) {
      this.logger.error('Weekly schedule execution failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        day_of_week: this.dayOfWeek
      };
    }
  }

  // ==================== MONDAY: FIXTURES OR NO MATCH ====================

  /**
   * Post Monday fixtures or "no match scheduled" (Bible compliance)
   * @returns {Object} Posting result
   */
  postMondayFixtures() {
    this.logger.enterFunction('postMondayFixtures');
    
    try {
      // @testHook(monday_fixtures_start)
      
      // Get this week's fixtures
      const thisWeekFixtures = this.getThisWeekFixtures();
      
      let payload;
      if (thisWeekFixtures.length > 0) {
        // We have fixtures this week
        payload = this.createWeeklyFixturesPayload(thisWeekFixtures);
      } else {
        // No matches this week
        payload = this.createNoMatchPayload();
      }
      
      // @testHook(monday_fixtures_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postMondayFixtures', { 
        success: webhookResult.success,
        fixture_count: thisWeekFixtures.length
      });
      
      return {
        success: webhookResult.success,
        content_type: thisWeekFixtures.length > 0 ? 'weekly_fixtures' : 'weekly_no_match',
        fixture_count: thisWeekFixtures.length,
        fixtures: thisWeekFixtures,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Monday fixtures posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== TUESDAY: QUOTES ====================

  /**
   * Post Tuesday motivational quotes (Bible compliance)
   * @returns {Object} Posting result
   */
  postTuesdayQuotes() {
    this.logger.enterFunction('postTuesdayQuotes');
    
    try {
      // @testHook(tuesday_quotes_start)
      
      // Get rotated quote
      const selectedQuote = this.getRotatedQuote();
      
      if (!selectedQuote) {
        throw new Error('No quotes available');
      }
      
      const validation = this.validateQuoteLength(selectedQuote.text);

      if (!validation.valid) {
        const measuredLength = validation.length || (selectedQuote?.text ? String(selectedQuote.text).length : 0);
        this.logger.warn('Quote length validation failed', {
          measured_length: measuredLength,
          max_length: validation.maxLength,
          reason: validation.reason || 'exceeds_max_length'
        });
        throw new Error(`Quote text exceeds maximum length (${measuredLength}/${validation.maxLength})`);
      }

      if (validation.wasTruncated) {
        this.logger.warn('Quote text truncated to fit configured maximum', {
          max_length: validation.maxLength
        });
      }

      const normalizedQuote = {
        ...selectedQuote,
        text: validation.sanitizedText,
        wasTruncated: validation.wasTruncated || false
      };

      // Create quotes payload
      const payload = this.createQuotesPayload(normalizedQuote, validation);
      
      // @testHook(tuesday_quotes_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postTuesdayQuotes', { success: webhookResult.success });
      
      return {
        success: webhookResult.success,
        content_type: 'weekly_quotes',
        quote: selectedQuote,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Tuesday quotes posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== WEDNESDAY: STATS OR OPPOSITION ====================

  /**
   * Post Wednesday stats or opposition analysis (Bible compliance)
   * @returns {Object} Posting result
   */
  postWednesdayStats() {
    this.logger.enterFunction('postWednesdayStats');
    
    try {
      // @testHook(wednesday_stats_start)
      
      // Check if it's monthly stats time (1st Wednesday of month)
      const isMonthlyStatsTime = this.isFirstWednesdayOfMonth();
      
      let payload;
      if (isMonthlyStatsTime) {
        // Post monthly player stats
        payload = this.createMonthlyStatsPayload();
      } else {
        // Post opposition analysis for this week's match
        const sundayMatch = this.getSundayMatch();
        if (sundayMatch) {
          payload = this.createOppositionAnalysisPayload(sundayMatch);
          // If no historical data available, fallback to general stats
          if (!payload) {
            this.logger.info(`No historical data for ${sundayMatch.Opposition}, posting general stats instead`);
            payload = this.createGeneralStatsPayload();
          }
        } else {
          // Fallback to general stats
          payload = this.createGeneralStatsPayload();
        }
      }
      
      // @testHook(wednesday_stats_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postWednesdayStats', { 
        success: webhookResult.success,
        content_type: payload.event_type
      });
      
      return {
        success: webhookResult.success,
        content_type: payload.event_type,
        is_monthly_stats: isMonthlyStatsTime,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Wednesday stats posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== THURSDAY: THROWBACK OR COUNTDOWN ====================

  /**
   * Post Thursday throwback or countdown (Bible compliance)
   * @returns {Object} Posting result
   */
  postThursdayThrowback() {
    this.logger.enterFunction('postThursdayThrowback');
    
    try {
      // @testHook(thursday_throwback_start)
      
      const countdownState = this.getCountdownState(3);

      if (countdownState.suppressed) {
        this.logger.info('Countdown suppressed due to postponed fixture', {
          days_before: 3,
          fixture: countdownState.fixture
        });
      }

      let payload;
      if (countdownState.due) {
        payload = this.createCountdownPayload(countdownState.fixture, 3);
      } else {
        const throwback = this.getRotatedThrowback();
        payload = this.createThrowbackPayload(throwback);
      }

      // @testHook(thursday_throwback_webhook)
      const webhookResult = this.sendToMake(payload);

      this.logger.exitFunction('postThursdayThrowback', {
        success: webhookResult.success,
        has_match: countdownState.due,
        suppressed: countdownState.suppressed
      });

      return {
        success: webhookResult.success,
        content_type: countdownState.due ? 'weekly_countdown_3' : 'weekly_throwback',
        has_sunday_match: countdownState.due,
        suppressed_due_to_postponement: countdownState.suppressed,
        countdown_fixture: countdownState.fixture || null,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Thursday throwback posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== FRIDAY: 2 DAYS TO GO ====================

  /**
   * Post Friday countdown - 2 days to go (Bible compliance)
   * @returns {Object} Posting result
   */
  postFridayCountdown() {
    this.logger.enterFunction('postFridayCountdown');
    
    try {
      // @testHook(friday_countdown_start)
      
      const countdownState = this.getCountdownState(2);

      if (countdownState.suppressed) {
        return {
          success: true,
          message: 'Fixture postponed - countdown suppressed',
          skipped: true,
          suppressed_due_to_postponement: true,
          countdown_fixture: countdownState.fixture
        };
      }

      if (!countdownState.due) {
        return {
          success: true,
          message: 'Countdown not scheduled for today',
          skipped: true
        };
      }

      const payload = this.createCountdownPayload(countdownState.fixture, 2);

      // @testHook(friday_countdown_webhook)
      const webhookResult = this.sendToMake(payload);

      this.logger.exitFunction('postFridayCountdown', { success: webhookResult.success });

      return {
        success: webhookResult.success,
        content_type: 'weekly_countdown_2',
        countdown_fixture: countdownState.fixture,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Friday countdown posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SATURDAY: 1 DAY TO GO ====================

  /**
   * Post Saturday countdown - 1 day to go (Bible compliance)
   * @returns {Object} Posting result
   */
  postSaturdayCountdown() {
    this.logger.enterFunction('postSaturdayCountdown');
    
    try {
      // @testHook(saturday_countdown_start)
      
      const countdownState = this.getCountdownState(1);

      if (countdownState.suppressed) {
        return {
          success: true,
          message: 'Fixture postponed - countdown suppressed',
          skipped: true,
          suppressed_due_to_postponement: true,
          countdown_fixture: countdownState.fixture
        };
      }

      if (!countdownState.due) {
        return {
          success: true,
          message: 'Countdown not scheduled for today',
          skipped: true
        };
      }

      const payload = this.createCountdownPayload(countdownState.fixture, 1);

      // @testHook(saturday_countdown_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postSaturdayCountdown', { success: webhookResult.success });
      
      return {
        success: webhookResult.success,
        content_type: 'weekly_countdown_1',
        countdown_fixture: countdownState.fixture,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Saturday countdown posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SUNDAY: MATCH DAY ====================

  /**
   * Handle Sunday match day (Bible compliance)
   * @returns {Object} Handling result
   */
  handleMatchDay() {
    this.logger.enterFunction('handleMatchDay');
    
    try {
      // @testHook(match_day_start)
      
      const sundayMatch = this.getSundayMatch();
      
      if (!sundayMatch) {
        return { 
          success: true, 
          message: 'No match today - Sunday rest day',
          is_rest_day: true
        };
      }
      
      // Match day is handled by live match processing
      // Weekly scheduler just acknowledges it's match day
      this.logger.info('Match day detected - live processing will handle events', {
        match: sundayMatch
      });
      
      this.logger.exitFunction('handleMatchDay', { success: true });
      
      return {
        success: true,
        content_type: 'match_day',
        is_match_day: true,
        match: sundayMatch,
        message: 'Match day - live processing active'
      };
      
    } catch (error) {
      this.logger.error('Match day handling failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== DATA RETRIEVAL METHODS ====================

  /**
   * Get this week's fixtures
   * @returns {Array} This week's fixtures
   */
  getThisWeekFixtures() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (!fixturesSheet) return [];
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const weekStart = DateUtils.getWeekStart(this.today);
      const weekEnd = DateUtils.getWeekEnd(this.today);
      
      return allFixtures.filter(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        return fixtureDate && fixtureDate >= weekStart && fixtureDate <= weekEnd;
      });
      
    } catch (error) {
      this.logger.error('Failed to get this week fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get Sunday's match if it exists
   * @returns {Object|null} Sunday match or null
   */
  getSundayMatch() {
    try {
      const thisWeekFixtures = this.getThisWeekFixtures();

      const sundayFixture = thisWeekFixtures.find(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate || fixtureDate.getDay() !== 0) {
          return false;
        }

        return !this.isFixturePostponed(fixture);
      });

      return sundayFixture || null;

    } catch (error) {
      this.logger.error('Failed to get Sunday match', { error: error.toString() });
      return null;
    }
  }

  /**
   * Get upcoming fixtures within lookahead window
   * @param {number} lookAheadDays - Days to look ahead
   * @returns {Array} Upcoming fixtures
   */
  getUpcomingFixturesWithin(lookAheadDays) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );

      if (!fixturesSheet) return [];

      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const today = this.normalizeDate(this.today);
      const msPerDay = 24 * 60 * 60 * 1000;

      return allFixtures
        .filter(fixture => {
          const fixtureDate = DateUtils.parseUK(fixture.Date);
          if (!fixtureDate) return false;

          const normalizedFixture = this.normalizeDate(fixtureDate);
          const diffDays = Math.round((normalizedFixture.getTime() - today.getTime()) / msPerDay);

          return diffDays >= 0 && diffDays <= lookAheadDays;
        })
        .sort((a, b) => {
          const dateA = this.normalizeDate(DateUtils.parseUK(a.Date));
          const dateB = this.normalizeDate(DateUtils.parseUK(b.Date));

          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;

          return dateA - dateB;
        });

    } catch (error) {
      this.logger.error('Failed to get upcoming fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Determine countdown state for a given days-before window
   * @param {number} daysBefore - Days before match
   * @returns {Object} Countdown state
   */
  getCountdownState(daysBefore) {
    try {
      const countdownConfig = getConfigValue('WEEKLY_SCHEDULE.COUNTDOWN', {});
      const lookAhead = countdownConfig.LOOKAHEAD_DAYS || 10;
      const fixtures = this.getUpcomingFixturesWithin(lookAhead);
      const today = this.normalizeDate(this.today);
      const msPerDay = 24 * 60 * 60 * 1000;

      for (let i = 0; i < fixtures.length; i += 1) {
        const fixture = fixtures[i];
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate) continue;

        const normalizedFixture = this.normalizeDate(fixtureDate);
        const diffDays = Math.round((normalizedFixture.getTime() - today.getTime()) / msPerDay);

        if (diffDays === daysBefore) {
          if (countdownConfig.SUPPRESS_ON_POSTPONED && this.isFixturePostponed(fixture)) {
            return {
              due: false,
              suppressed: true,
              fixture
            };
          }

          return {
            due: true,
            suppressed: false,
            fixture
          };
        }
      }

      return {
        due: false,
        suppressed: false
      };

    } catch (error) {
      this.logger.error('Failed to evaluate countdown state', {
        error: error.toString(),
        days_before: daysBefore
      });

      return {
        due: false,
        suppressed: false,
        error: error.toString()
      };
    }
  }

  /**
   * Normalize date to midnight
   * @param {Date} date - Date to normalize
   * @returns {Date} Normalized date
   */
  normalizeDate(date) {
    if (!(date instanceof Date)) {
      return new Date(NaN);
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Determine if fixture is postponed
   * @param {Object} fixture - Fixture row
   * @returns {boolean} True if postponed
   */
  isFixturePostponed(fixture) {
    if (!fixture || typeof fixture !== 'object') {
      return false;
    }

    const statusFields = ['Status', 'Match Status', 'Fixture Status', 'Postponed', 'Postponement'];

    return statusFields.some(field => {
      const value = fixture[field];

      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      const text = String(value).toLowerCase();
      return text === 'yes' || text === 'true' || text.includes('postpon');
    });
  }

  /**
   * Get rotated motivational quote
   * @returns {Object} Selected quote
   */
  getRotatedQuote() {
    try {
      const defaultQuotes = [
        {
          text: "The harder you work for something, the greater you'll feel when you achieve it.",
          author: "Unknown",
          category: "motivation"
        },
        {
          text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
          author: "Winston Churchill",
          category: "perseverance"
        },
        {
          text: "It's not whether you get knocked down; it's whether you get up.",
          author: "Vince Lombardi",
          category: "resilience"
        },
        {
          text: "Champions train, losers complain.",
          author: "Unknown",
          category: "training"
        },
        {
          text: "The difference between ordinary and extraordinary is that little extra.",
          author: "Jimmy Johnson",
          category: "excellence"
        }
      ];

      const quotesPool = [];

      try {
        const quotesSheet = SheetUtils.getOrCreateSheet('Quotes', ['Quote', 'Author', 'Category']);
        const customQuotes = SheetUtils.getAllDataAsObjects(quotesSheet);

        customQuotes.forEach(quote => {
          if (quote && quote.Quote) {
            quotesPool.push({
              text: quote.Quote,
              author: quote.Author || 'Unknown',
              category: quote.Category || 'motivation'
            });
          }
        });
      } catch (sheetError) {
        this.logger.warn('Could not access quotes sheet, using defaults', { error: sheetError.toString() });
      }

      if (quotesPool.length === 0) {
        quotesPool.push(...defaultQuotes);
      }

      const rotationKey = this.getRotationPropertyKey('quotes');
      const selectedQuote = this.getRandomUnusedRotationItem(
        quotesPool,
        quote => `${quote.text}||${quote.author}`,
        rotationKey
      );

      if (selectedQuote) {
        return selectedQuote;
      }

      return quotesPool[0];
      
    } catch (error) {
      this.logger.error('Failed to get rotated quote', { error: error.toString() });
      return {
        text: "Every match is a new opportunity to show what we're made of.",
        author: getConfigValue('SYSTEM.CLUB_NAME', 'Your Football Club'),
        category: "motivation"
      };
    }
  }

  /**
   * Get rotated throwback content
   * @returns {Object} Selected throwback
   */
  getRotatedThrowback() {
    try {
      const defaultThrowbacks = [
        {
          title: "Great Goal from Last Season",
          description: "Remember this fantastic strike that put us ahead in a crucial match!",
          year: "2023",
          category: "goals"
        },
        {
          title: "Epic Team Performance",
          description: "Looking back at one of our most dominant displays on the pitch.",
          year: "2023",
          category: "team"
        },
        {
          title: "Memorable Victory",
          description: "This win will be remembered for years to come - what a match!",
          year: "2022",
          category: "victories"
        }
      ];

      const throwbacksPool = [];

      try {
        const throwbackSheet = SheetUtils.getOrCreateSheet(
          'Historical Data',
          ['Title', 'Description', 'Year', 'Category', 'Image URL']
        );
        const customThrowbacks = SheetUtils.getAllDataAsObjects(throwbackSheet);

        customThrowbacks.forEach(item => {
          if (item && item.Title) {
            throwbacksPool.push({
              title: item.Title,
              description: item.Description,
              year: item.Year,
              category: item.Category || 'general',
              image_url: item['Image URL'] || ''
            });
          }
        });
      } catch (sheetError) {
        this.logger.warn('Could not access historical data sheet, using defaults', { error: sheetError.toString() });
      }

      if (throwbacksPool.length === 0) {
        throwbacksPool.push(...defaultThrowbacks);
      }

      const rotationKey = this.getRotationPropertyKey('throwbacks');
      const selectedThrowback = this.getRandomUnusedRotationItem(
        throwbacksPool,
        item => `${item.title}||${item.year || ''}`,
        rotationKey
      );

      if (selectedThrowback) {
        return selectedThrowback;
      }

      return throwbacksPool[0];

    } catch (error) {
      this.logger.error('Failed to get rotated throwback', { error: error.toString() });
      return {
        title: "Tigers Memories",
        description: "Every Thursday we remember the great moments that made us who we are today.",
        year: new Date().getFullYear().toString(),
        category: "general"
      };
    }
  }

  /**
   * Get rotation property key
   * @param {string} type - Rotation type (quotes|throwbacks)
   * @returns {string|null} Property key
   */
  getRotationPropertyKey(type) {
    const rotationConfig = getConfigValue('WEEKLY_SCHEDULE.ROTATION', {});

    if (type === 'quotes') {
      return rotationConfig.QUOTES_PROPERTY_KEY || 'WEEKLY_QUOTES_ROTATION';
    }

    if (type === 'throwbacks') {
      return rotationConfig.THROWBACK_PROPERTY_KEY || 'WEEKLY_THROWBACK_ROTATION';
    }

    return null;
  }

  /**
   * Select random unused item for rotation
   * @param {Array} items - Array of items
   * @param {Function} idSelector - Function returning unique id string
   * @param {string} propertyKey - Script property key
   * @returns {Object|null} Selected item
   */
  getRandomUnusedRotationItem(items, idSelector, propertyKey) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    if (!propertyKey) {
      const randomIndex = Math.floor(Math.random() * items.length);
      return items[randomIndex];
    }

    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const stored = scriptProperties.getProperty(propertyKey);
      const usedIds = stored ? JSON.parse(stored) : [];
      const usedSet = new Set(Array.isArray(usedIds) ? usedIds : []);

      let unusedItems = items.filter(item => {
        try {
          const itemId = idSelector(item);
          return itemId && !usedSet.has(itemId);
        } catch (innerError) {
          this.logger.warn('Rotation id selector failed', { error: innerError.toString() });
          return false;
        }
      });

      if (unusedItems.length === 0) {
        unusedItems = items.slice();
        usedSet.clear();
      }

      const randomIndex = Math.floor(Math.random() * unusedItems.length);
      const selectedItem = unusedItems[randomIndex];
      const selectedId = idSelector(selectedItem);

      if (selectedId) {
        usedSet.add(selectedId);
        scriptProperties.setProperty(propertyKey, JSON.stringify(Array.from(usedSet)));
      }

      return selectedItem;

    } catch (error) {
      this.logger.warn('Rotation state handling failed', { error: error.toString(), propertyKey });
      const randomIndex = Math.floor(Math.random() * items.length);
      return items[randomIndex];
    }
  }

  /**
   * Check if today is first Wednesday of month
   * @returns {boolean} True if first Wednesday
   */
  isFirstWednesdayOfMonth() {
    if (this.dayOfWeek !== 3) return false; // Not Wednesday
    
    const currentDate = this.today.getDate();
    return currentDate <= 7; // First week of month
  }

  // ==================== PAYLOAD CREATION METHODS ====================

  /**
   * Build template variant collection for a post type.
   * @param {string} postType - Post type identifier.
   * @param {Object} context - Context data for placeholders.
   * @returns {Object} Variant collection.
   */
  buildTemplateVariants(postType, context = {}) {
    if (!this.variantBuilderAvailable) {
      return {};
    }

    try {
      return buildTemplateVariantCollection(postType, context);
    } catch (error) {
      this.logger.warn('Template variant generation failed', {
        error: error.toString(),
        post_type: postType
      });
      return {};
    }
  }

  /**
   * Create weekly fixtures payload
   * @param {Array} fixtures - This week's fixtures
   * @returns {Object} Payload object
   */
  createWeeklyFixturesPayload(fixtures) {
    const fixturesList = fixtures.map(fixture => ({
      date: fixture.Date,
      time: fixture.Time,
      opponent: fixture.Opposition,
      venue: fixture.Venue,
      competition: fixture.Competition,
      home_away: fixture['Home/Away']
    }));

    const weekDescription = this.generateWeekDescription(fixtures);
    const weekStart = DateUtils.formatUK(DateUtils.getWeekStart(this.today));
    const variantContext = {
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      fixture_count: fixtures.length,
      fixtures_list: fixturesList,
      primary_fixture: fixturesList[0] || null,
      week_description: weekDescription,
      week_start_date: weekStart,
      generated_for_date: DateUtils.formatUK(this.today)
    };

    const templateVariants = this.buildTemplateVariants('fixtures', variantContext);

    return {
      event_type: 'weekly_fixtures',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // Weekly fixtures data
      week_start_date: weekStart,
      fixture_count: fixtures.length,
      fixtures_list: fixturesList,

      // Content metadata
      content_title: `This Week's Fixtures`,
      week_description: weekDescription,
      season: getConfigValue('SYSTEM.SEASON'),

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create no match payload
   * @returns {Object} Payload object
   */
  createNoMatchPayload() {
    const nextFixture = this.getNextFixture();
    const normalizedNextFixture = nextFixture
      ? {
          opponent: nextFixture.Opposition,
          date: nextFixture.Date,
          time: nextFixture.Time,
          venue: nextFixture.Venue
        }
      : null;

    const variantContext = {
      content_title: 'Rest Week',
      message: 'No match scheduled this week',
      next_fixture: normalizedNextFixture
    };

    const templateVariants = this.buildTemplateVariants('rest_week', variantContext);

    return {
      event_type: 'weekly_no_match',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // No match data
      week_start_date: DateUtils.formatUK(DateUtils.getWeekStart(this.today)),
      message: 'No match scheduled this week',
      content_title: 'Rest Week',
      
      // Alternative content
      training_focus: 'Use this week to focus on training and preparation',
      next_fixture: normalizedNextFixture,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create quotes payload
   * @param {Object} quote - Selected quote
   * @returns {Object} Payload object
   */
  createQuotesPayload(quote, validation = null) {
    const inspirationTheme = this.getInspirationalTheme();
    const variantContext = {
      content_title: 'Tuesday Motivation',
      quote_text: quote.text,
      quote_author: quote.author,
      inspiration_theme: inspirationTheme,
      generated_for_date: DateUtils.formatUK(this.today)
    };

    const templateVariants = this.buildTemplateVariants('quotes', variantContext);
    const maxLength = validation?.maxLength || getConfigValue('WEEKLY_SCHEDULE.QUOTE_VALIDATION.DEFAULT_MAX_LENGTH', 220);
    const wasTruncated = validation?.wasTruncated || !!quote.wasTruncated;

    return {
      event_type: 'weekly_quotes',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // Quote data
      quote_text: quote.text,
      quote_author: quote.author,
      quote_category: quote.category,
      content_title: 'Tuesday Motivation',
      quote_text_max_length: maxLength,
      quote_text_was_truncated: wasTruncated,

      // Metadata
      inspiration_theme: inspirationTheme,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Validate quote length with configurable limits
   * @param {string} quoteText - Quote content
   * @returns {Object} Validation result
   */
  validateQuoteLength(quoteText) {
    const validationConfig = getConfigValue('WEEKLY_SCHEDULE.QUOTE_VALIDATION', {}) || {};
    const propertyKey = validationConfig.MAX_LENGTH_PROPERTY || 'WEEKLY_QUOTES_MAX_LENGTH';
    let maxLength = parseInt(validationConfig.DEFAULT_MAX_LENGTH, 10);
    if (!maxLength || Number.isNaN(maxLength)) {
      maxLength = 220;
    }

    let allowTruncation = validationConfig.ALLOW_TRUNCATION !== false;

    try {
      if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
        const scriptProperties = PropertiesService.getScriptProperties();
        const stored = scriptProperties.getProperty(propertyKey);

        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
              if (parsed.maxLength && !Number.isNaN(parseInt(parsed.maxLength, 10))) {
                maxLength = parseInt(parsed.maxLength, 10);
              }
              if (typeof parsed.allowTruncate === 'boolean') {
                allowTruncation = parsed.allowTruncate;
              }
            }
          } catch (jsonError) {
            const numeric = parseInt(stored, 10);
            if (!Number.isNaN(numeric) && numeric > 0) {
              maxLength = numeric;
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to read quote validation settings', { error: error.toString() });
    }

    const sanitizedText = quoteText ? String(quoteText).trim().replace(/\s+/g, ' ') : '';
    const measuredLength = sanitizedText.length;

    if (!sanitizedText) {
      return {
        valid: false,
        sanitizedText,
        maxLength,
        length: measuredLength,
        reason: 'empty_text',
        wasTruncated: false
      };
    }

    if (measuredLength <= maxLength) {
      return {
        valid: true,
        sanitizedText,
        maxLength,
        length: measuredLength,
        wasTruncated: false
      };
    }

    if (!allowTruncation) {
      return {
        valid: false,
        sanitizedText,
        maxLength,
        length: measuredLength,
        reason: 'exceeds_max_length',
        wasTruncated: false
      };
    }

    let truncated = sanitizedText.slice(0, maxLength);
    if (!truncated.trim()) {
      truncated = sanitizedText.slice(0, Math.min(maxLength, sanitizedText.length));
    }

    return {
      valid: true,
      sanitizedText: truncated.trim(),
      maxLength,
      length: Math.min(measuredLength, maxLength),
      wasTruncated: true,
      reason: 'truncated_to_fit'
    };
  }

  /**
   * Create monthly stats payload
   * @returns {Object} Payload object
   */
  createMonthlyStatsPayload() {
    const reportingPeriod = DateUtils.getMonthName(this.today.getMonth() + 1);
    const variantContext = {
      content_title: 'Monthly Player Statistics',
      reporting_period: reportingPeriod,
      stats_summary: 'Detailed player statistics for this month',
      generated_for_date: DateUtils.formatUK(this.today)
    };

    const templateVariants = this.buildTemplateVariants('stats', variantContext);

    return {
      event_type: 'weekly_stats',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // Stats data
      stats_type: 'monthly_summary',
      content_title: 'Monthly Player Statistics',
      reporting_period: reportingPeriod,

      // Note: Actual stats would be pulled from player management
      stats_summary: 'Detailed player statistics for this month',

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create opposition analysis payload with historical data
   * @param {Object} match - Sunday match
   * @returns {Object} Payload object
   */
  createOppositionAnalysisPayload(match) {
    // Get comprehensive historical data
    const historicalData = this.getHistoricalDataForOpponent(match.Opposition);
    const previousMeetings = this.getPreviousMeetings(match.Opposition);
    const keyPlayers = 'Opposition key players to watch';

    // Only create payload if historical data exists
    if (!historicalData.hasHistory) {
      this.logger.info(`No historical data for ${match.Opposition}, skipping opposition analysis`);
      return null;
    }

    const variantContext = {
      content_title: `Head-to-Head: ${getConfigValue('SYSTEM.CLUB_NAME')} vs ${match.Opposition}`,
      opponent_name: match.Opposition,
      match_date: match.Date,
      previous_meetings: previousMeetings,
      opposition_form: 'Recent form analysis',
      key_players: keyPlayers,
      historical_record: historicalData.stats.totalMatches > 0 ?
        `Played ${historicalData.stats.totalMatches}: Won ${historicalData.stats.wins}, Drew ${historicalData.stats.draws}, Lost ${historicalData.stats.losses}` :
        'First meeting between these teams',
      recent_results: historicalData.matches.slice(0, 3).map(m => `${m.Result || 'Unknown'} (${m.Date || 'Unknown date'})`).join(' | ')
    };

    const templateVariants = this.buildTemplateVariants('stats', variantContext);

    return {
      event_type: 'historical_comparison',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // Opposition analysis with historical data
      stats_type: 'opposition_analysis_historical',
      content_title: `Head-to-Head: vs ${match.Opposition}`,
      opponent_name: match.Opposition,
      match_date: match.Date,

      // Historical analysis data
      has_history: historicalData.hasHistory,
      total_meetings: historicalData.stats.totalMatches,
      head_to_head_record: `Played ${historicalData.stats.totalMatches}: Won ${historicalData.stats.wins}, Drew ${historicalData.stats.draws}, Lost ${historicalData.stats.losses}`,
      wins: historicalData.stats.wins,
      draws: historicalData.stats.draws,
      losses: historicalData.stats.losses,
      goals_for: historicalData.stats.goalsFor,
      goals_against: historicalData.stats.goalsAgainst,
      goal_difference: historicalData.stats.goalsFor - historicalData.stats.goalsAgainst,

      // Recent meetings
      recent_meetings_count: Math.min(historicalData.matches.length, 3),
      recent_meetings: historicalData.matches.slice(0, 3).map(match => ({
        result: match.Result || 'Unknown',
        date: match.Date || 'Unknown date',
        venue: match.Venue || 'Unknown venue'
      })),
      form_guide: historicalData.matches.slice(0, 3).map(m => `${m.Result || 'Unknown'} (${m.Date || 'Unknown date'})`).join(' | '),

      // Last meeting details
      last_meeting_result: historicalData.lastMeeting ? historicalData.lastMeeting.Result : null,
      last_meeting_date: historicalData.lastMeeting ? historicalData.lastMeeting.Date : null,
      last_meeting_venue: historicalData.lastMeeting ? historicalData.lastMeeting.Venue : null,

      // Additional context
      previous_meetings: previousMeetings,
      opposition_form: 'Recent form analysis',
      key_players: keyPlayers,
      is_first_meeting: historicalData.stats.totalMatches === 0,
      dominant_team: this.getDominantTeam(historicalData.stats, getConfigValue('SYSTEM.CLUB_NAME')),

      // Canva placeholders for historical posts
      fixture_preview_title: `${getConfigValue('SYSTEM.CLUB_NAME')} vs ${match.Opposition}`,
      historical_stats_text: `Played ${historicalData.stats.totalMatches}: Won ${historicalData.stats.wins}, Drew ${historicalData.stats.draws}, Lost ${historicalData.stats.losses}`,
      recent_form_text: historicalData.matches.slice(0, 3).map(m => `${m.Result || 'Unknown'}`).join(' | '),
      next_match_text: `Next: ${new Date(match.Date).toLocaleDateString('en-GB')} at ${match.Venue || 'TBC'}`,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create general stats payload
   * @returns {Object} Payload object
   */
  createGeneralStatsPayload() {
    const variantContext = {
      content_title: 'Team Statistics Update',
      stats_summary: 'Current season statistics',
      season_progress: 'Current season statistics',
      team_form: 'Recent team performance'
    };

    const templateVariants = this.buildTemplateVariants('stats', variantContext);

    return {
      event_type: 'weekly_stats',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // General stats
      stats_type: 'general_update',
      content_title: 'Team Statistics Update',
      
      // Basic stats
      season_progress: 'Current season statistics',
      team_form: 'Recent team performance',

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create throwback payload
   * @param {Object} throwback - Selected throwback
   * @returns {Object} Payload object
   */
  createThrowbackPayload(throwback) {
    const variantContext = {
      content_title: 'Throwback Thursday',
      throwback_year: throwback.year,
      throwback_description: throwback.description,
      image_url: throwback.image_url || ''
    };

    const templateVariants = this.buildTemplateVariants('throwback', variantContext);

    return {
      event_type: 'weekly_throwback',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),

      // Throwback data
      throwback_title: throwback.title,
      throwback_description: throwback.description,
      throwback_year: throwback.year,
      throwback_category: throwback.category,
      image_url: throwback.image_url || '',
      
      // Content metadata
      content_title: 'Throwback Thursday',
      nostalgia_factor: 'high',

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create countdown payload
   * @param {Object} match - Upcoming match
   * @param {number} daysToGo - Days until match
   * @returns {Object} Payload object
   */
  createCountdownPayload(match, daysToGo) {
    const eventType = daysToGo === 2 ? 'weekly_countdown_2' :
                     daysToGo === 1 ? 'weekly_countdown_1' :
                     'weekly_countdown_3';

    const anticipationMessage = this.getAnticipationMessage(daysToGo);
    const variantContext = {
      content_title: `${daysToGo} ${daysToGo === 1 ? 'Day' : 'Days'} To Go`,
      countdown_days: daysToGo,
      match_opponent: match.Opposition,
      match_date: match.Date,
      match_time: match.Time,
      match_competition: match.Competition,
      anticipation_message: anticipationMessage
    };

    const templateVariants = this.buildTemplateVariants('countdown', variantContext);

    return {
      event_type: eventType,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      
      // Countdown data
      countdown_days: daysToGo,
      content_title: `${daysToGo} ${daysToGo === 1 ? 'Day' : 'Days'} To Go`,
      
      // Match data
      match_opponent: match.Opposition,
      match_date: match.Date,
      match_time: match.Time,
      match_venue: match.Venue,
      match_competition: match.Competition,
      home_away: match['Home/Away'],
      
      // Excitement metadata
      excitement_level: daysToGo === 1 ? 'maximum' : 'high',
      anticipation_message: anticipationMessage,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Send payload to Make.com
   * @param {Object} payload - Payload to send
   * @returns {Object} Send result
   */
  sendToMake(payload) {
    let consentDecision = null;
    try {
      const consentContext = {
        module: 'weekly_scheduler',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players: []
      };

      // @testHook(weekly_payload_consent_start)
      consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(weekly_payload_consent_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Weekly scheduler payload blocked by consent gate', {
          event_type: payload.event_type,
          reason: consentDecision.reason
        });
        return {
          success: false,
          blocked: true,
          reason: consentDecision.reason,
          consent: consentDecision
        };
      }

      const enrichedPayload = ConsentGate.applyDecisionToPayload(payload, consentDecision);

      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(enrichedPayload),
        muteHttpExceptions: true
      });

      const success = response.getResponseCode() === 200;

      return {
        success: success,
        response_code: response.getResponseCode(),
        response_text: response.getContentText(),
        consent: consentDecision
      };

    } catch (error) {
      this.logger.error('Failed to send to Make.com', { error: error.toString() });
      return { success: false, error: error.toString(), consent: consentDecision };
    }
  }

  /**
   * Generate week description
   * @param {Array} fixtures - Week's fixtures
   * @returns {string} Week description
   */
  generateWeekDescription(fixtures) {
    if (fixtures.length === 0) return 'Rest week';
    if (fixtures.length === 1) return 'Single fixture week';
    
    const homeCount = fixtures.filter(f => f['Home/Away'] === 'Home').length;
    const awayCount = fixtures.length - homeCount;
    
    if (homeCount > 0 && awayCount > 0) {
      return 'Mixed home and away week';
    } else if (homeCount > 0) {
      return `${homeCount} home fixture${homeCount > 1 ? 's' : ''}`;
    } else {
      return `${awayCount} away fixture${awayCount > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get next fixture after this week
   * @returns {Object|null} Next fixture or null
   */
  getNextFixture() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (!fixturesSheet) return null;
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const weekEnd = DateUtils.getWeekEnd(this.today);
      
      const futureFixtures = allFixtures.filter(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        return fixtureDate && fixtureDate > weekEnd;
      }).sort((a, b) => {
        const dateA = DateUtils.parseUK(a.Date);
        const dateB = DateUtils.parseUK(b.Date);
        return dateA - dateB;
      });
      
      return futureFixtures.length > 0 ? futureFixtures[0] : null;
      
    } catch (error) {
      this.logger.error('Failed to get next fixture', { error: error.toString() });
      return null;
    }
  }

  /**
   * Get inspirational theme
   * @returns {string} Theme for the week
   */
  getInspirationalTheme() {
    const themes = [
      'perseverance', 'teamwork', 'excellence', 'dedication', 
      'improvement', 'unity', 'determination', 'passion'
    ];
    const randomIndex = Math.floor(Math.random() * themes.length);
    return themes[randomIndex];
  }

  /**
   * Get comprehensive historical data for opponent
   * @param {string} opponent - Opposition team name
   * @returns {Object} Historical data object
   */
  getHistoricalDataForOpponent(opponent) {
    try {
      // Use the HistoricalFixturesManager for comprehensive data
      // Note: Requires historical-fixtures.gs to be loaded in the same project
      const historicalManager = new HistoricalFixturesManager();
      return historicalManager.getHistoricalResults(opponent);
    } catch (error) {
      this.logger.error('Failed to get historical data', { error: error.toString() });
      return {
        hasHistory: false,
        matches: [],
        stats: {
          totalMatches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0
        },
        lastMeeting: null
      };
    }
  }

  /**
   * Determine which team has been dominant historically
   * @param {Object} stats - Historical stats object
   * @param {string} clubName - Our club name
   * @returns {string} Dominant team ('equal', club name, or 'opponent')
   */
  getDominantTeam(stats, clubName) {
    if (stats.totalMatches === 0) return 'equal';
    if (stats.wins > stats.losses) return clubName;
    if (stats.losses > stats.wins) return 'opponent';
    return 'equal';
  }

  /**
   * Get previous meetings with opponent
   * @param {string} opponent - Opposition team
   * @returns {string} Previous meetings summary
   */
  getPreviousMeetings(opponent) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (!resultsSheet) return 'No previous meeting data available';
      
      const allResults = SheetUtils.getAllDataAsObjects(resultsSheet);
      const previousMeetings = allResults.filter(result => 
        result.Opposition === opponent
      );
      
      if (previousMeetings.length === 0) {
        return 'First time facing this opponent';
      }
      
      const recentMeetings = previousMeetings.slice(-3); // Last 3 meetings
      return `Last ${recentMeetings.length} meeting${recentMeetings.length > 1 ? 's' : ''} recorded`;
      
    } catch (error) {
      this.logger.error('Failed to get previous meetings', { error: error.toString() });
      return 'Previous meeting data unavailable';
    }
  }

  /**
   * Get anticipation message for countdown
   * @param {number} daysToGo - Days until match
   * @returns {string} Anticipation message
   */
  getAnticipationMessage(daysToGo) {
    switch (daysToGo) {
      case 3:
        return 'The excitement is building - preparation time!';
      case 2:
        return 'Almost there - final preparations underway!';
      case 1:
        return 'It\'s almost time - let\'s show them what we\'re made of!';
      default:
        return 'Get ready for an amazing match!';
    }
  }
}

// ==================== BIRTHDAY AUTOMATION ====================

class BirthdayAutomation {

  constructor() {
    this.loggerName = 'BirthdayAutomation';
    this._logger = null;
    this.makeIntegration = new MakeIntegration();
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  runDaily(referenceDate = DateUtils.now()) {
    const normalizedDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    this.logger.enterFunction('runDaily', {
      reference_date: DateUtils.formatISO(normalizedDate)
    });

    try {
      const config = this.getBirthdayConfig();

      if (!this.isEnabled(config)) {
        this.logger.exitFunction('runDaily', { success: true, skipped: true, reason: 'disabled' });
        return { success: true, skipped: true, reason: 'disabled' };
      }

      if (!config.ALLOW_MULTIPLE_PER_DAY) {
        const lastRunDate = this.getLastRunDate(config);
        if (lastRunDate && this.isSameDay(lastRunDate, normalizedDate)) {
          this.logger.exitFunction('runDaily', { success: true, skipped: true, reason: 'already_ran_today' });
          return { success: true, skipped: true, reason: 'already_ran_today' };
        }
      }

      const scriptProperties = this.getScriptProperties();
      const rosterSheet = this.getRosterSheet(config);

      if (!rosterSheet) {
        throw new Error('Roster sheet unavailable for birthday automation');
      }

      const headerRow = this.getHeaderRow(rosterSheet);
      const headerMap = this.resolveHeaderMap(headerRow, config);

      if (!headerMap.name || !headerMap.dob) {
        throw new Error('Birthday automation requires name and date of birth columns');
      }

      const rosterData = SheetUtils.getAllDataAsObjects(rosterSheet);
      const todaysBirthdays = this.findBirthdays(rosterData, normalizedDate, headerMap);

      const processedKey = this.buildProcessedPropertyKey(normalizedDate, config);
      const processedSet = this.readProcessedIds(scriptProperties, processedKey);

      const pendingBirthdays = todaysBirthdays.filter(entry => !processedSet.has(entry.id));

      if (pendingBirthdays.length === 0) {
        this.updateLastRun(scriptProperties, config, normalizedDate);
        this.logger.exitFunction('runDaily', {
          success: true,
          processed: 0,
          skipped: todaysBirthdays.length > 0,
          reason: todaysBirthdays.length > 0 ? 'already_processed' : 'no_birthdays'
        });
        return {
          success: true,
          processed: 0,
          skipped: todaysBirthdays.length > 0,
          reason: todaysBirthdays.length > 0 ? 'already_processed' : 'no_birthdays',
          birthdays: todaysBirthdays.map(entry => ({
            player_name: entry.playerName,
            age: entry.age
          }))
        };
      }

      const timezone = getConfigValue('SYSTEM.TIMEZONE', 'Europe/London');
      const results = [];

      pendingBirthdays.forEach(entry => {
        const payload = this.createBirthdayPayload(entry, normalizedDate);
        const idempotencyKey = `birthday:${Utilities.formatDate(normalizedDate, timezone, 'yyyyMMdd')}:${entry.id}`;
        const sendResult = this.makeIntegration.sendToMake(payload, { idempotencyKey });

        results.push({
          player_name: entry.playerName,
          success: !!sendResult?.success,
          response: sendResult
        });

        if (sendResult && sendResult.success) {
          processedSet.add(entry.id);
        }
      });

      this.writeProcessedIds(scriptProperties, processedKey, processedSet);
      this.updateLastRun(scriptProperties, config, normalizedDate);

      this.logger.exitFunction('runDaily', {
        success: true,
        processed: pendingBirthdays.length
      });

      return {
        success: true,
        processed: pendingBirthdays.length,
        birthdays: pendingBirthdays.map(entry => ({
          player_name: entry.playerName,
          age: entry.age,
          position: entry.position,
          squad_number: entry.squadNumber
        })),
        results
      };

    } catch (error) {
      this.logger.error('Birthday automation failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  getBirthdayConfig() {
    return getConfigValue('WEEKLY_SCHEDULE.BIRTHDAYS', {}) || {};
  }

  getScriptProperties() {
    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      return PropertiesService.getScriptProperties();
    }
    return {
      getProperty() { return ''; },
      setProperty() {},
      getProperties() { return {}; }
    };
  }

  isEnabled(config) {
    let enabled = config.DEFAULT_ENABLED !== false;
    try {
      const scriptProperties = this.getScriptProperties();
      const rawValue = scriptProperties.getProperty(config.ENABLED_PROPERTY || 'BIRTHDAY_AUTOMATION_ENABLED');
      if (typeof rawValue === 'string' && rawValue.trim()) {
        const normalized = rawValue.trim().toLowerCase();
        if (['false', '0', 'no', 'disabled'].includes(normalized)) {
          enabled = false;
        } else if (['true', '1', 'yes', 'enabled'].includes(normalized)) {
          enabled = true;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to resolve birthday automation enabled flag', { error: error.toString() });
    }
    return enabled;
  }

  getRosterSheet(config) {
    const sheetNameProperty = config.SHEET_NAME_PROPERTY || 'BIRTHDAY_SHEET_NAME';
    const defaultSheetName = config.DEFAULT_SHEET_NAME || 'Players';
    let sheetName = defaultSheetName;

    try {
      const scriptProperties = this.getScriptProperties();
      const storedName = scriptProperties.getProperty(sheetNameProperty);
      if (storedName && storedName.trim()) {
        sheetName = storedName.trim();
      }
    } catch (error) {
      this.logger.warn('Failed to resolve birthday sheet name from script properties', { error: error.toString() });
    }

    const requiredHeaders = this.getRequiredHeaders(config);
    return SheetUtils.getOrCreateSheet(sheetName, requiredHeaders);
  }

  getRequiredHeaders(config) {
    const nameHeaders = Array.isArray(config.NAME_HEADERS) ? config.NAME_HEADERS : ['Player Name'];
    const dobHeaders = Array.isArray(config.DOB_HEADERS) ? config.DOB_HEADERS : ['Date of Birth'];
    const positionHeaders = Array.isArray(config.POSITION_HEADERS) ? config.POSITION_HEADERS : ['Position'];
    const squadHeaders = Array.isArray(config.SQUAD_NUMBER_HEADERS) ? config.SQUAD_NUMBER_HEADERS : ['Squad Number'];

    return mergeUniqueArrays(nameHeaders, dobHeaders, positionHeaders, squadHeaders);
  }

  getHeaderRow(sheet) {
    if (!sheet || typeof sheet.getLastColumn !== 'function') {
      return [];
    }
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) {
      return [];
    }
    return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  }

  resolveHeaderMap(headerRow, config) {
    const mapHeader = (options) => {
      return options.find(option => headerRow.includes(option)) || null;
    };

    const nameHeader = mapHeader(Array.isArray(config.NAME_HEADERS) ? config.NAME_HEADERS : []);
    const dobHeader = mapHeader(Array.isArray(config.DOB_HEADERS) ? config.DOB_HEADERS : []);
    const positionHeader = mapHeader(Array.isArray(config.POSITION_HEADERS) ? config.POSITION_HEADERS : []);
    const squadHeader = mapHeader(Array.isArray(config.SQUAD_NUMBER_HEADERS) ? config.SQUAD_NUMBER_HEADERS : []);

    return {
      name: nameHeader,
      dob: dobHeader,
      position: positionHeader,
      squadNumber: squadHeader
    };
  }

  findBirthdays(rows, referenceDate, headerMap) {
    const targetMonth = referenceDate.getMonth();
    const targetDay = referenceDate.getDate();
    const birthdays = [];

    rows.forEach(row => {
      const rawName = headerMap.name ? row[headerMap.name] : '';
      const rawDob = headerMap.dob ? row[headerMap.dob] : '';

      const playerName = rawName ? String(rawName).trim() : '';
      const birthDate = this.parseDate(rawDob);

      if (!playerName || !birthDate) {
        return;
      }

      let celebrationDay = birthDate.getDate();
      const celebrationMonth = birthDate.getMonth();

      if (celebrationMonth === 1 && celebrationDay === 29 && !this.isLeapYear(referenceDate.getFullYear())) {
        celebrationDay = 28;
      }

      if (celebrationMonth !== targetMonth || celebrationDay !== targetDay) {
        return;
      }

      const age = this.calculateAge(birthDate, referenceDate);
      const position = headerMap.position ? String(row[headerMap.position] || '').trim() : '';
      const squadNumber = headerMap.squadNumber ? String(row[headerMap.squadNumber] || '').trim() : '';
      const id = this.buildPlayerId(playerName, birthDate);

      birthdays.push({
        id,
        playerName,
        birthDate,
        age,
        position,
        squadNumber
      });
    });

    return birthdays;
  }

  parseDate(value) {
    if (!value) {
      return null;
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      return new Date(value.getTime());
    }

    const asString = String(value).trim();
    if (!asString) {
      return null;
    }

    const parsedUk = DateUtils.parseUK(asString);
    if (parsedUk) {
      return parsedUk;
    }

    const parsed = new Date(asString);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  calculateAge(birthDate, referenceDate) {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const referenceMonth = referenceDate.getMonth();
    const birthMonth = birthDate.getMonth();

    if (referenceMonth < birthMonth || (referenceMonth === birthMonth && referenceDate.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  }

  buildPlayerId(playerName, birthDate) {
    const timezone = getConfigValue('SYSTEM.TIMEZONE', 'Europe/London');
    const nameSlug = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const dateSlug = Utilities.formatDate(birthDate, timezone, 'yyyyMMdd');
    return `${nameSlug || 'player'}_${dateSlug}`;
  }

  buildProcessedPropertyKey(referenceDate, config) {
    const prefix = config.PROCESSED_PREFIX || 'BIRTHDAY_PROCESSED_';
    const timezone = getConfigValue('SYSTEM.TIMEZONE', 'Europe/London');
    return `${prefix}${Utilities.formatDate(referenceDate, timezone, 'yyyyMMdd')}`;
  }

  readProcessedIds(scriptProperties, propertyKey) {
    try {
      const stored = scriptProperties.getProperty(propertyKey);
      if (!stored) {
        return new Set();
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    } catch (error) {
      this.logger.warn('Failed to parse processed birthday ids', { error: error.toString() });
    }
    return new Set();
  }

  writeProcessedIds(scriptProperties, propertyKey, processedSet) {
    try {
      const serialized = JSON.stringify(Array.from(processedSet));
      scriptProperties.setProperty(propertyKey, serialized);
    } catch (error) {
      this.logger.warn('Failed to persist processed birthday ids', { error: error.toString() });
    }
  }

  updateLastRun(scriptProperties, config, referenceDate) {
    try {
      const propertyKey = config.LAST_RUN_PROPERTY || 'BIRTHDAY_AUTOMATION_LAST_RUN';
      scriptProperties.setProperty(propertyKey, DateUtils.formatISO(referenceDate));
    } catch (error) {
      this.logger.warn('Failed to update birthday automation last run property', { error: error.toString() });
    }
  }

  getLastRunDate(config) {
    try {
      const propertyKey = config.LAST_RUN_PROPERTY || 'BIRTHDAY_AUTOMATION_LAST_RUN';
      const scriptProperties = this.getScriptProperties();
      const stored = scriptProperties.getProperty(propertyKey);
      if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to read birthday automation last run property', { error: error.toString() });
    }
    return null;
  }

  createBirthdayPayload(entry, referenceDate) {
    const eventType = getConfigValue('MAKE.EVENT_TYPES.birthday', 'player_birthday');
    const timezone = getConfigValue('SYSTEM.TIMEZONE', 'Europe/London');
    const variantContext = {
      content_title: 'Happy Birthday!',
      player_name: entry.playerName,
      age: entry.age,
      position: entry.position,
      squad_number: entry.squadNumber,
      celebration_date: DateUtils.formatUK(referenceDate)
    };

    const templateVariants = this.buildTemplateVariants(variantContext);

    return {
      event_type: eventType,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      player_name: entry.playerName,
      player_position: entry.position,
      squad_number: entry.squadNumber,
      age: entry.age,
      date_of_birth: DateUtils.formatUK(entry.birthDate),
      birthdate_iso: DateUtils.formatISO(entry.birthDate),
      celebration_date: DateUtils.formatUK(referenceDate),
      celebration_iso: DateUtils.formatISO(referenceDate),
      idempotency_key: `birthday_${entry.id}`,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      template_variants: templateVariants,
      timezone
    };
  }

  buildTemplateVariants(context) {
    if (typeof buildTemplateVariantCollection !== 'function') {
      return {};
    }

    try {
      return buildTemplateVariantCollection('birthday', context);
    } catch (error) {
      this.logger.warn('Birthday template variant generation failed', { error: error.toString() });
      return {};
    }
  }

  isLeapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
  }

  isSameDay(firstDate, secondDate) {
    return firstDate.getFullYear() === secondDate.getFullYear()
      && firstDate.getMonth() === secondDate.getMonth()
      && firstDate.getDate() === secondDate.getDate();
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Weekly Scheduler
 * @returns {Object} Initialization result
 */
function initializeWeeklyScheduler() {
  logger.enterFunction('WeeklyScheduler.initialize');
  
  try {
    // Test required sheets
    const requiredSheets = [
      'Quotes',
      'Historical Data'
    ];
    
    const sheetResults = {};
    
    requiredSheets.forEach(sheetName => {
      const sheet = SheetUtils.getOrCreateSheet(sheetName);
      sheetResults[sheetName] = !!sheet;
    });
    
    const allSheetsOk = Object.values(sheetResults).every(result => result === true);
    
    logger.exitFunction('WeeklyScheduler.initialize', { success: allSheetsOk });
    
    return {
      success: allSheetsOk,
      sheets: sheetResults,
      message: 'Weekly Scheduler initialized successfully',
      version: '6.2.0'
    };
    
  } catch (error) {
    logger.error('Weekly Scheduler initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Run weekly schedule automation (public API)
 * @param {boolean} forceRun - Force run regardless of day
 * @returns {Object} Execution result
 */
function runWeeklyScheduleAutomation(forceRun = false) {
  const scheduler = new WeeklyScheduler();
  return scheduler.runWeeklySchedule(forceRun);
}

/**
 * Run daily birthday automation
 * @param {Date|string} [referenceDate] - Optional date override
 * @returns {Object} Execution result
 */
function runDailyBirthdayAutomation(referenceDate = null) {
  const automation = new BirthdayAutomation();

  if (referenceDate) {
    const dateCandidate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    if (!isNaN(dateCandidate.getTime())) {
      return automation.runDaily(dateCandidate);
    }
  }

  return automation.runDaily();
}

/**
 * Convenience wrapper to run birthday automation for a specific ISO date
 * @param {string} isoDate - ISO date string
 * @returns {Object} Execution result
 */
function runBirthdayAutomationForDate(isoDate) {
  if (!isoDate) {
    return runDailyBirthdayAutomation();
  }

  const parsed = new Date(isoDate);
  if (isNaN(parsed.getTime())) {
    throw new Error('Invalid date supplied to runBirthdayAutomationForDate');
  }

  return runDailyBirthdayAutomation(parsed);
}

/**
 * Run specific day's content (public API)
 * @param {number} dayOfWeek - Day of week (0-6)
 * @returns {Object} Execution result
 */
function runSpecificDayContent(dayOfWeek) {
  const scheduler = new WeeklyScheduler();
  scheduler.dayOfWeek = dayOfWeek;
  return scheduler.runWeeklySchedule(true);
}

/**
 * Get weekly schedule status (public API)
 * @returns {Object} Schedule status
 */
function getWeeklyScheduleStatus() {
  try {
    const today = DateUtils.now();
    const dayOfWeek = DateUtils.getDayOfWeek(today);
    const schedule = getConfigValue('WEEKLY_SCHEDULE.SCHEDULE', {});
    const todaySchedule = schedule[dayOfWeek];
    
    return {
      success: true,
      current_day: dayOfWeek,
      day_name: today.toLocaleDateString('en-GB', { weekday: 'long' }),
      today_schedule: todaySchedule,
      content_enabled: todaySchedule?.enabled || false,
      content_type: todaySchedule?.type || 'none',
      bible_compliant: getConfigValue('WEEKLY_SCHEDULE.ENABLED', true)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test weekly scheduler functionality
 * @returns {Object} Test results
 */
function testWeeklyScheduler() {
  logger.enterFunction('WeeklyScheduler.test');
  
  try {
    const scheduler = new WeeklyScheduler();
    const results = {
      initialization: false,
      quote_rotation: false,
      throwback_rotation: false,
      fixture_detection: false,
      payload_creation: false
    };
    
    // Test initialization
    const initResult = initializeWeeklyScheduler();
    results.initialization = initResult.success;
    
    // Test quote rotation
    try {
      const quote = scheduler.getRotatedQuote();
      results.quote_rotation = quote && quote.text;
    } catch (error) {
      logger.warn('Quote rotation test failed', { error: error.toString() });
    }
    
    // Test throwback rotation
    try {
      const throwback = scheduler.getRotatedThrowback();
      results.throwback_rotation = throwback && throwback.title;
    } catch (error) {
      logger.warn('Throwback rotation test failed', { error: error.toString() });
    }
    
    // Test fixture detection
    try {
      const sundayMatch = scheduler.getSundayMatch();
      results.fixture_detection = true; // Success if no error
    } catch (error) {
      logger.warn('Fixture detection test failed', { error: error.toString() });
    }
    
    // Test payload creation
    try {
      const testPayload = scheduler.createNoMatchPayload();
      results.payload_creation = testPayload && testPayload.event_type;
    } catch (error) {
      logger.warn('Payload creation test failed', { error: error.toString() });
    }
    
    const overallSuccess = Object.values(results).every(result => result === true);
    
    logger.exitFunction('WeeklyScheduler.test', { success: overallSuccess });
    
    return {
      success: overallSuccess,
      test_results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Weekly scheduler test failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

