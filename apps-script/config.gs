/**
 * @fileoverview Centralized configuration for Football Club Automation System
 * @version 6.2.0
 * @author Senior Software Architect
 * @description All system configuration in one place - no globals elsewhere
 * 
 * CRITICAL: This is the single source of truth for all configuration.
 * No hard-coded values anywhere else in the system.
 * Test: GitHub Actions deployment configured
 */

// ==================== SYSTEM CONFIGURATION ====================

/**
 * Global config for Football Club Automation System
 * Enables use of standalone Apps Script project with linked Sheet
 * @version 6.2.0
 */
const CONFIG_LOGGER = typeof logger !== 'undefined' && logger && typeof logger.scope === 'function'
  ? logger.scope('Config')
  : {
    enterFunction() {},
    exitFunction() {},
    error() {}
  };

const CONFIG_SCRIPT_PROPERTY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let CONFIG_SCRIPT_PROPERTY_CACHE = null;
let CONFIG_SCRIPT_PROPERTY_CACHE_EXPIRES_AT = 0;

/**
 * Lazy accessor for configured sheet ID
 * Only resolves when actually needed, allows installer to run first
 */
function getConfiguredSheetId_() {
  CONFIG_LOGGER.enterFunction('getConfiguredSheetId_');

  try {
    const propertyValue = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const trimmedValue = propertyValue && typeof propertyValue === 'string' ? propertyValue.trim() : '';

    if (!trimmedValue) {
      const error = new Error('SPREADSHEET_ID script property is not configured. Run SA_INSTALL() first to configure the system.');
      CONFIG_LOGGER.error(error.message);
      throw error;
    }

    CONFIG_LOGGER.exitFunction('getConfiguredSheetId_', { success: true });
    return trimmedValue;
  } catch (error) {
    CONFIG_LOGGER.exitFunction('getConfiguredSheetId_', { success: false });
    throw error;
  }
}

/**
 * Runtime-safe accessor for spreadsheet ID from config
 * Replaces getConfigValue('SHEETS.SPREADSHEET_ID') calls
 */
function getSpreadsheetIdFromConfig() {
  return getConfiguredSheetId_();
}

/**
 * Returns the main spreadsheet using the configured sheet ID
 * Replaces all use of getActiveSpreadsheet()
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSheet() {
  CONFIG_LOGGER.enterFunction('getSheet');

  try {
    // @testHook(config_get_sheet_open_start)
    const sheetId = getConfiguredSheetId_();
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    // @testHook(config_get_sheet_open_complete)

    CONFIG_LOGGER.exitFunction('getSheet', {
      success: true,
      sheetId: sheetId
    });
    return spreadsheet;
  } catch (error) {
    CONFIG_LOGGER.error('Failed to open spreadsheet by ID', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
    CONFIG_LOGGER.exitFunction('getSheet', { success: false });
    throw error;
  }
}

/**
 * Merge arrays into a unique ordered list (legacy + new columns)
 * @param {...Array<*>} arrays - Arrays of values to merge
 * @returns {Array<*>} Array with unique entries preserving first occurrence order
 */
function mergeUniqueArrays() {
  const merged = [];

  for (let i = 0; i < arguments.length; i += 1) {
    const current = Array.isArray(arguments[i]) ? arguments[i] : [];
    current.forEach(value => {
      if (!merged.includes(value)) {
        merged.push(value);
      }
    });
  }

  return merged;
}

/**
 * Master system configuration object
 * @constant {Object} SYSTEM_CONFIG
 */
const SYSTEM_CONFIG = {
  
  // ==================== SYSTEM METADATA ====================
  SYSTEM: {
    VERSION: '6.2.0',
    NAME: 'Football Club Automation System',
    DESCRIPTION: 'Live football automation with weekly content calendar',
    ENVIRONMENT: 'production', // production | development | testing
    TIMEZONE: 'Europe/London',
    CLUB_NAME: 'Your Football Club',
    CLUB_SHORT_NAME: 'YFC',
    SEASON: '2024/25',
    LEAGUE: 'Your League',
    AGE_GROUP: "Senior Men's",
    LAST_UPDATED: '2025-09-27',
    
    // Bible compliance settings
    BIBLE_COMPLIANT: true,
    WEEKLY_SCHEDULE_ENABLED: true,
    OPPOSITION_AUTO_DETECTION: true,
    PLAYER_MINUTES_AUTO_CALC: true
  },

  // ==================== BRANDING & CUSTOMER EXPERIENCE ====================
  BRANDING: {
    PRIMARY_COLOR: '#ff6600',
    SECONDARY_COLOR: '#000000',
    BADGE_URL: '',
    BADGE_STORAGE_PROPERTY: 'BUYER_BADGE_BASE64',
    LAST_ASSET_UPDATE: ''
  },

  CUSTOMER: {
    DEFAULT_PROFILE: {
      buyerId: 'default_buyer',
      clubName: 'Your Football Club',
      clubShortName: 'YFC',
      league: 'Local League',  // Fixed: removed self-referential getConfigValue call
      ageGroup: "Senior Men's",
      primaryColor: '#ff6600',
      secondaryColor: '#000000',
      badgeUrl: '',
      rosterEntries: []
    },

    PROPERTY_KEYS: {
      PROFILE: 'BUYER_PROFILE',
      PROFILE_ID: 'BUYER_PROFILE_ID',
      BADGE_BASE64: 'BUYER_BADGE_BASE64'
    },

    SHEETS: {
      PROFILE_TAB_KEY: 'BUYER_PROFILES',
      ROSTER_TAB_KEY: 'BUYER_ROSTERS'
    },

    ACTIVE_PROFILE: null
  },

  // ==================== FEATURE FLAGS ====================
  FEATURES: {
    // Core features
    LIVE_MATCH_PROCESSING: true,
    BATCH_POSTING: true,
    PLAYER_STATISTICS: true,
    MAKE_INTEGRATION: true,
    
    // Enhanced features from spec
    OPPOSITION_EVENT_HANDLING: true,
    SECOND_YELLOW_PROCESSING: true,
    MONTHLY_SUMMARIES: true,
    GOTM: true,
    GOTS: true,
    WEEKLY_CONTENT_AUTOMATION: true,
    POSTPONED_MATCH_HANDLING: true,
    PLAYER_MINUTES_TRACKING: true,
    SUB_SWAPPING_SYSTEM: true,
    
    // Advanced features
    VIDEO_INTEGRATION: true,
    VIDEO_CLIP_CREATION: true,
    YOUTUBE_AUTOMATION: false, // Enable when ready
    XBOTGO_INTEGRATION: false, // Enable when configured
    ADVANCED_ANALYTICS: false,
    AI_CONTENT_GENERATION: false,
    LIVE_STREAMING: false,
    VOICE_COMMENTARY: false,

    // Future features
    TIKTOK_POSTING: false,
    GOAL_OF_MONTH: false,
    MULTI_TENANT: false,
    FACEBOOK_POSTING: true,
    TWITTER_POSTING: true,
    INSTAGRAM_POSTING: true
  },

  LIVE_MATCH_CONSOLE: {
    STATUS_OPTIONS: [
      { id: 'kick_off', label: 'Kick-off' },
      { id: 'half_time', label: 'Half-time' },
      { id: 'second_half_kickoff', label: '2nd Half Kick-off' },
      { id: 'full_time', label: 'Full-time' }
    ],
    CARD_TYPES: [
      { id: 'yellow', label: 'Yellow Card' },
      { id: 'second_yellow', label: 'Second Yellow (Red)' },
      { id: 'red', label: 'Red Card' },
      { id: 'sin_bin', label: 'Sin Bin' }
    ],
    NOTE_MARKERS: [
      { id: 'big_chance', label: 'Big chance' },
      { id: 'great_tackle', label: 'Great tackle' },
      { id: 'good_play', label: 'Good play' },
      { id: 'goal', label: 'Goal clip marker' }
    ],
    DEFAULT_MATCH_ID_PROPERTY: 'LIVE_MATCH_ACTIVE_ID',
    RECENT_EVENT_LIMIT: 8
  },

  MATCHDAY_ASSETS: {
    CARD_ICONS: {
      PROPERTY_KEY: 'MATCHDAY_CARD_ICON_MAP',
      DEFAULTS: {
        card_yellow: '',
        card_red: '',
        card_second_yellow: '',
        card_sin_bin: '',
        discipline_opposition: ''
      }
    }
  },

  // ==================== DOCUMENTATION REFERENCE ====================
  DOCUMENTATION: {
    VERSION: '6.2.0',
    SOURCE_FILES: {
      BIBLE: 'System-Workings - AKA The Bible.md',
      CLAUDE: 'CLAUDE.md',
      TASKS: 'TASKS.md',
      PLANNING: 'PLANNING.md'
    },

    WEEKLY_SCHEDULE: {
      MONDAY: [
        "This week's fixtures",
        'No match scheduled this week'
      ],
      TUESDAY: ['Quotes'],
      WEDNESDAY: [
        'Player stats - Monthly',
        "Previous matches against this week's team"
      ],
      THURSDAY: ['Throwback Thursday', '3 days to go'],
      FRIDAY: ['2 days to go'],
      SATURDAY: ['1 day to go'],
      SUNDAY: [
        'Match day',
        'Kick off',
        'Live Match Updates',
        'Day results',
        'League tables'
      ]
    },

    OTHER_POSTS: [
      'Birthdays - as and when',
      'Club Fixtures - 1st day of the month',
      'Club Results - last day of the Month',
      'Goal of the month competition - repost daily until voting closes',
      'Voting closing reminders for competitions',
      'Goal of the month winner announced 5 days after competition opens',
      'Goal of the season competition using monthly winners and runners up',
      'Two week goal of the season campaign after final match',
      'Postponed match alerts canceling countdown posts',
      'Sponsor highlights page/posts',
      'Highlight clips and video recaps'
    ],

    MATCH_DAY_OPERATIONS: {
      PRE_MATCH: [
        'Fixture moves into Live Match Updates tab on match day',
        'Control panel toggles enable/disable automation features'
      ],
      STATUS_UPDATES: [
        'Kick off',
        'Half-time',
        'Second half kick-off',
        'Full time'
      ],
      GOAL_LOGIC: [
        'Selecting player "Goal" counts as opposition goal',
        'Brace and hat-trick detection for tailored posts',
        'Opposition goal updates do not affect player stats'
      ],
      DISCIPLINE: [
        'Cards logged with player dropdown',
        'Opposition cards logged against opposition entity'
      ],
      PLAYER_TRACKING: [
        'Player minutes auto calculated from kickoff/subs/full-time',
        'Appearances, goals, assists, cards and minutes updated in real time'
      ],
      VIDEO_NOTES: [
        'Notes dropdown marks video editor cues (big chance, tackle, good play, goal)',
        'Notes include player dropdown to reference individuals'
      ],
      VIDEO_REQUIREMENTS: [
        'Highlight video overlays match clock with team names',
        'Goal events trigger banner and replay zoom',
        'Video clips stored per player in Google Drive folders'
      ],
      LIVE_STREAMING: [
        'Consider live streaming to Facebook, YouTube, Instagram, TikTok'
      ],
      MANUAL_INPUT: [
        'Allow manual entry of player stats and historical data when needed'
      ]
    },

    CLAUDE_GUIDANCE: {
      PROJECT_OVERVIEW: {
        SUMMARY: 'Comprehensive automation platform for football clubs',
        WEEKLY_SCHEDULE: ['Monday fixtures', 'Tuesday quotes', 'Wednesday stats/opposition history', 'Thursday throwback & countdown', 'Friday two days to go', 'Saturday one day to go', 'Sunday match day operations'],
        MATCHDAY_AUTOMATION: [
          'Live match tab activation on match day',
          'Status update workflow with send checkbox',
          'Opposition goal and card detection',
          'MOTM selection and player minutes tracking'
        ],
        CONTENT_TYPES: [
          'Live match events',
          'Weekly batch content',
          'Monthly summaries',
          'Special posts (birthdays, postponements, goal competitions)',
          'Video highlight content'
        ]
      },
      TECHNOLOGY_STACK: [
        'Google Sheets input layer',
        'Google Apps Script processing',
        'Make.com automation with router branches',
        'Canva for templated graphics',
        'Google Drive storage',
        'YouTube API and video tooling',
        'XbotGo scoreboard integration',
        'GitHub Pages data feeds'
      ],
      DESIGN_PRINCIPLES: [
        'Bible compliance governs implementation',
        'Strict weekly schedule automation',
        'Modular components per .gs file',
        'Centralized configuration only in config.js',
        'Idempotent external calls using unique keys',
        'Graceful fallback handling for missing data',
        'Comprehensive logging and @testHook usage'
      ],
      CODE_STANDARDS: {
        LOGGING_PATTERN: 'logger.enterFunction/exitFunction with try/catch and @testHook markers',
        CONFIG_ACCESS: 'Use getConfig utility instead of literals',
        SHEET_ACCESS: 'Use SheetUtils safe helpers with validation'
      }
    },

    TASK_STATUS: {
      UPDATED: '2025-09-20',
      CRITICAL_MISSING: [
        'Weekly content calendar automation',
        'Opposition goal auto-detection',
        'Real-time player minutes calculation',
        'Video clip metadata generation',
        'Video editor notes system',
        'Feature toggle control panel'
      ],
      FOUNDATIONS: [
        'Core Apps Script framework',
        'Event processing for goals/cards/MOTM',
        'Robust Google Sheets integration',
        'Make.com webhook and router setup',
        'Idempotent social media posting',
        'Version standardization and documentation',
        'Comprehensive logging infrastructure'
      ],
      METRICS: {
        WEEKLY_SCHEDULE: '0% implemented',
        OPPOSITION_DETECTION: '0% implemented',
        PLAYER_MINUTES: '0% implemented',
        VIDEO_INTEGRATION: '0% implemented',
        CONTROL_PANEL: '0% implemented'
      },
      PHASES: {
        PHASE_1: {
          DEADLINE: '2025-10-31',
          FOCUS: 'Bible core implementation',
          ESTIMATED_HOURS: 60,
          STATUS: 'Not started'
        }
      }
    },

    PLANNING: {
      MISSION_STATEMENT: 'Automate every moment of your football club with Bible-compliant workflows.',
      VISION_2025: 'Every Goal. Every Card. Every Moment. Every Day of the Week. Automated.',
      SUCCESS_TARGETS: [
        '10,000+ social followers',
        '95% automated posting',
        'Perfect weekly schedule compliance',
        '100% match event automation',
        'Complete video pipeline delivery',
        '50+ clubs using automation template',
        '£10,000+ annual digital revenue',
        'Industry recognition for innovation'
      ],
      ARCHITECTURE: {
        INPUT_LAYER: ['Weekly schedule triggers', 'Live match Google Sheets', 'Admin control panel', 'Email fixture ingestion'],
        PROCESSING_CORE: ['Weekly scheduler', 'Event manager', 'Player manager', 'Video manager'],
        INTEGRATIONS: ['Make.com routers', 'Canva templates', 'Video processing workflows', 'External APIs'],
        DISTRIBUTION: ['Facebook', 'Twitter/X', 'Instagram', 'TikTok', 'YouTube Shorts']
      },
      NOTES: [
        'System must remain under Make.com free tier limits',
        'All automation must support manual overrides',
        'Templates stored for repeatable Canva usage'
      ]
    }
  },

  // ==================== GOOGLE SHEETS CONFIGURATION ====================
  SHEETS: {
    // SPREADSHEET_ID removed - use getConfiguredSheetId_() helper instead
    TAB_NAMES: {
      // Core sheets
      LIVE_MATCH: 'Live Match Updates',
      FIXTURES: 'Fixtures',
      RESULTS: 'Results',
      PLAYER_STATS: 'Player Stats',
      PLAYER_EVENTS: 'Player Events',
      LIVE_MATCH_UPDATES: 'Live Match Updates',
      FIXTURES_RESULTS: 'Fixtures & Results',
      PLAYER_MINUTES: 'Player Minutes',
      
      // Enhanced sheets from spec
      SUBS_LOG: 'Subs Log',
      OPPOSITION_EVENTS: 'Opposition Events',
      VIDEO_CLIPS: 'Video Clips',
      MONTHLY_CONTENT: 'Monthly Content',
      MONTHLY_SUMMARIES: 'Monthly Summaries',
      WEEKLY_SCHEDULE: 'Weekly Schedule',
      WEEKLY_CONTENT: 'Weekly Content Calendar',
      
      // System sheets
      CONTROL_PANEL: 'Control Panel',
      CONFIG: 'Config',
      LOGS: 'Logs',
      NOTES: 'Notes',
      QUOTES: 'Quotes',
      HISTORICAL_DATA: 'Historical Data',

      PRIVACY_PLAYERS: 'Privacy Players',
      PRIVACY_CONSENTS: 'Privacy Consents',
      PRIVACY_AUDIT: 'Privacy Audit Log',


      BUYER_PROFILES: 'Buyer Profiles',
      BUYER_ROSTERS: 'Buyer Rosters',
      

      // Future sheets
      SEASON_STATS: 'Season Stats',
      GOAL_OF_MONTH: 'GOTM Tracking',
      MONTHLY_STATS: 'Monthly Stats'
    },

    REQUIRED_COLUMNS: {
      LIVE_MATCH: [
        'Minute', 'Event', 'Player', 'Assist', 'Card Type',
        'Send', 'Posted', 'Match ID', 'Timestamp', 'Notes'
      ],
      LIVE_MATCH_UPDATES: [
        'Timestamp', 'Minute', 'Event', 'Player', 'Opponent', 'Home Score',
        'Away Score', 'Card Type', 'Assist', 'Notes', 'Send', 'Status'
      ],
      FIXTURES: [
        'Date', 'Time', 'Opposition', 'Venue', 'Competition',
        'Home/Away', 'Send', 'Posted', 'Match ID', 'Status'
      ],
      FIXTURES_RESULTS: [
        'Match Date', 'Opponent', 'Competition', 'Home/Away', 'Result',
        'Scoreline', 'Send Status', 'Posted At', 'Notes'
      ],
      RESULTS: [
        'Date', 'Opposition', 'Home Score', 'Away Score', 'Venue',
        'Competition', 'Home/Away', 'Result', 'Send', 'Posted', 'Match ID'
      ],
      PLAYER_STATS: mergeUniqueArrays(
        [
          'Player', 'Appearances', 'Starts', 'Sub Apps', 'Goals',
          'Penalties', 'Assists', 'Yellow Cards', 'Red Cards',
          'Sin Bins', 'MOTM', 'Minutes', 'Last Updated'
        ],
        [
          'Player Name', 'Goals', 'Assists', 'Position', 'Squad Number'
        ]
      ),
      PLAYER_EVENTS: [
        'Match ID', 'Date', 'Player', 'Event Type', 'Minute',
        'Details', 'Competition', 'Opposition', 'Timestamp'
      ],
      BUYER_PROFILES: [
        'Buyer ID', 'Club Name', 'Club Short Name', 'League', 'Age Group',
        'Primary Colour', 'Secondary Colour', 'Badge URL', 'Last Updated'
      ],
      BUYER_ROSTERS: [
        'Buyer ID', 'Player Name', 'Position', 'Squad Number', 'Last Updated'
      ],
      SUBS_LOG: mergeUniqueArrays(
        [
          'Match ID', 'Date', 'Minute', 'Player Off', 'Player On',
          'Home/Away', 'Reason', 'Timestamp'
        ],
        [
          'Match Date'
        ]
      ),
      OPPOSITION_EVENTS: [
        'Match ID', 'Date', 'Event Type', 'Minute', 'Details',
        'Posted', 'Timestamp'
      ],
      VIDEO_CLIPS: mergeUniqueArrays(
        [
          'Match ID', 'Player', 'Event Type', 'Minute', 'Start Time',
          'Duration', 'Title', 'Caption', 'Status', 'YouTube URL',
          'Folder Path', 'Created'
        ],
        [
          'Match Date', 'Local Path', 'Notes'
        ]
      ),
      MONTHLY_CONTENT: [
        'Month Key',
        'Type',
        'Event Type',
        'Count',
        'Statistics JSON',
        'Payload Preview',
        'Processed At',
        'Idempotency Key',
        'Make Result'
      ],
      WEEKLY_CONTENT: [
        'Date', 'Day', 'Content Type', 'Status', 'Posted At', 'Event Type', 'Notes'
      ],
      MONTHLY_SUMMARIES: [
        'Timestamp', 'Month_Key', 'Summary_Type', 'Item_Count',
        'Summary_Data', 'Posted', 'Responses', 'Created'
      ],
      PRIVACY_PLAYERS: [
        'Player ID', 'Full Name', 'Date of Birth', 'Guardian Name', 'Guardian Email',
        'Guardian Phone', 'Default Consent Status', 'Default Consent Expiry',
        'Anonymise Faces', 'Use Initials Only', 'Last Reviewed'
      ],
      PRIVACY_CONSENTS: [
        'Consent ID', 'Player ID', 'Consent Type', 'Status', 'Captured At',
        'Expires At', 'Proof Reference', 'Source', 'Notes', 'Revoked At',
        'Anonymise Faces', 'Use Initials Only'
      ],
      PRIVACY_AUDIT: [
        'Timestamp', 'Player ID', 'Player Name', 'Action', 'Media Type',
        'Platform', 'Decision', 'Reason', 'Context', 'Performed By'
      ],
      QUOTES: [
        'Quote', 'Author', 'Category'
      ],
      HISTORICAL_DATA: [
        'Title', 'Description', 'Year', 'Category', 'Image URL'
      ]
    },

    NAMED_RANGES: {
      WEEKLY_CONTENT: {
        HEADERS: 'WEEKLY_CONTENT_HEADERS',
        TABLE: 'WEEKLY_CONTENT_TABLE'
      },
      QUOTES: {
        HEADERS: 'QUOTES_HEADERS',
        TABLE: 'QUOTES_TABLE'
      },
      HISTORICAL_DATA: {
        HEADERS: 'HISTORICAL_DATA_HEADERS',
        TABLE: 'HISTORICAL_DATA_TABLE'
      }
    }
  },

  // ==================== MAKE.COM INTEGRATION ====================
  MAKE: {
    WEBHOOK_URL_PROPERTY: 'MAKE_WEBHOOK_URL', // PropertiesService key
    WEBHOOK_TIMEOUT_MS: 30000,
    WEBHOOK_RETRY_ATTEMPTS: 3,
    WEBHOOK_RETRY_DELAY_MS: 2000,
    WEBHOOK_URL_FALLBACK: 'MAKE_WEBHOOK_URL_FALLBACK',
    WEBHOOK_SECRET: PropertiesService.getScriptProperties().getProperty('MAKE_WEBHOOK_SECRET') || '', // For signature validation
    IDEMPOTENCY: {
      ENABLED: true,
      TTL_SECONDS: 86400,
      CACHE_PREFIX: 'MAKE_IDEMPOTENCY_'
    },

    // Webhook security settings
    SECURITY: {
      SIGNATURE_VALIDATION: {
        ENABLED: true,
        REQUIRED: false, // Don't fail if secret not configured
        ALGORITHM: 'SHA256',
        HEADER_NAME: 'X-Make-Signature'
      },
      TIMESTAMP_VALIDATION: {
        ENABLED: true,
        TOLERANCE_SECONDS: 300, // 5 minutes
        HEADER_NAME: 'X-Make-Timestamp'
      },
      USER_AGENT_VALIDATION: {
        ENABLED: true,
        REQUIRED_SUBSTRING: 'Make.com'
      }
    },
    
    // Event type mappings for router
    EVENT_TYPES: {
      // Live match events
      GOAL_TEAM: 'goal_team',
      GOAL_OPPOSITION: 'goal_opposition', // NEW: Opposition goals
      ASSIST: 'assist',
      CARD_YELLOW: 'card_yellow',
      CARD_RED: 'card_red',
      CARD_SECOND_YELLOW: 'card_second_yellow', // NEW: 2nd yellow
      CARD_SIN_BIN: 'card_sin_bin',
      CARD_OPPOSITION: 'discipline_opposition', // NEW: Opposition cards
      MOTM: 'motm',
      SUBSTITUTION: 'substitution',
      
      // Match status events
      KICK_OFF: 'kick_off',
      HALF_TIME: 'half_time',
      SECOND_HALF_KICKOFF: 'second_half_kickoff', // NEW: From spec
      FULL_TIME: 'full_time',
      POSTPONED: 'match_postponed', // NEW: From spec
      
      // Batch events (1-5 variations)
      FIXTURES_1_LEAGUE: 'fixtures_1_league',
      FIXTURES_2_LEAGUE: 'fixtures_2_league',
      FIXTURES_3_LEAGUE: 'fixtures_3_league',
      FIXTURES_4_LEAGUE: 'fixtures_4_league',
      FIXTURES_5_LEAGUE: 'fixtures_5_league',
      
      RESULTS_1_LEAGUE: 'results_1_league',
      RESULTS_2_LEAGUE: 'results_2_league',
      RESULTS_3_LEAGUE: 'results_3_league',
      RESULTS_4_LEAGUE: 'results_4_league',
      RESULTS_5_LEAGUE: 'results_5_league',
      
      // Monthly events (NEW: From spec)
      FIXTURES_THIS_MONTH: 'fixtures_this_month',
      RESULTS_THIS_MONTH: 'results_this_month',
      PLAYER_STATS_SUMMARY: 'player_stats_summary',
      PLAYER_STATS_MONTHLY: 'player_stats_summary',

      // Weekly content events (NEW: Bible compliance)
      WEEKLY_FIXTURES: 'weekly_fixtures',
      WEEKLY_NO_MATCH: 'weekly_no_match',
      WEEKLY_QUOTES: 'weekly_quotes',
      WEEKLY_STATS: 'weekly_stats',
      WEEKLY_THROWBACK: 'weekly_throwback',
      WEEKLY_COUNTDOWN_2: 'weekly_countdown_2',
      WEEKLY_COUNTDOWN_1: 'weekly_countdown_1',
      VIDEO_CLIP_PROCESSING: 'video_clip_processing',
      MONDAY_FIXTURES: 'weekly_fixtures',
      TUESDAY_QUOTES: 'weekly_quotes',
      WEDNESDAY_STATS: 'weekly_stats',
      WEDNESDAY_OPPOSITION: 'weekly_opposition_analysis',
      HISTORICAL_COMPARISON: 'historical_comparison',
      THURSDAY_THROWBACK: 'weekly_throwback',
      FRIDAY_COUNTDOWN: 'weekly_countdown_2',
      SATURDAY_COUNTDOWN: 'weekly_countdown_1',

      // Legacy aliases for batch and special events
      second_half: 'match_second_half',
      second_half_kickoff: 'match_second_half_kickoff',
      fixtures_batch_1: 'fixtures_1_league',
      fixtures_batch_2: 'fixtures_2_league',
      fixtures_batch_3: 'fixtures_3_league',
      fixtures_batch_4: 'fixtures_4_league',
      fixtures_batch_5: 'fixtures_5_league',
      results_batch_1: 'results_1_league',
      results_batch_2: 'results_2_league',
      results_batch_3: 'results_3_league',
      results_batch_4: 'results_4_league',
      results_batch_5: 'results_5_league',
      birthday: 'player_birthday',
      gotm_voting_open: 'gotm_voting_start',
      gotm_winner: 'gotm_winner_announcement',
      gots_voting_open: 'gots_voting_start',
      gots_winner: 'gots_winner_announcement'
    },

    // Router content slot mapping for template variants
    CONTENT_SLOTS: {
      fixtures_1_league: 'fixtures',
      fixtures_2_league: 'fixtures',
      fixtures_3_league: 'fixtures',
      fixtures_4_league: 'fixtures',
      fixtures_5_league: 'fixtures',
      results_1_league: 'results',
      results_2_league: 'results',
      results_3_league: 'results',
      results_4_league: 'results',
      results_5_league: 'results',
      weekly_fixtures: 'fixtures',
      weekly_no_match: 'rest_week',
      weekly_quotes: 'quotes',
      weekly_stats: 'stats',
      weekly_throwback: 'throwback',
      weekly_countdown_3: 'countdown',
      weekly_countdown_2: 'countdown',
      weekly_countdown_1: 'countdown',
      fixtures_this_month: 'monthly_fixtures',
      results_this_month: 'monthly_results',
      player_stats_summary: 'stats',
      match_postponed: 'postponed_alert',
      goal_team: 'live_goal',
      goal_opposition: 'live_goal',
      card_yellow: 'discipline',
      card_red: 'discipline',
      card_second_yellow: 'discipline',
      card_sin_bin: 'discipline',
      motm: 'matchday',
      substitution: 'matchday'
    }
  },

  // ==================== PRIVACY & CONSENT MANAGEMENT ====================
  PRIVACY: {
    FAIL_CLOSED: true,
    MINOR_AGE_THRESHOLD: 16,
    CACHE_TTL_MS: 5 * 60 * 1000,
    EXPIRY_NOTICE_DAYS: 30,
    GLOBAL_FLAGS: {
      ANONYMISE_FACES: false,
      USE_INITIALS_ONLY: false
    },
    CONSENT_TYPES: {
      GENERAL_MEDIA: 'general_media',
      MATCHDAY: 'matchday',
      VIDEO_HIGHLIGHTS: 'video_highlights',
      PORTRAIT: 'portrait_photography'
    },
    REPORTING: {
      NIGHTLY_HOUR: 22,
      RECIPIENT_PROPERTY: 'PRIVACY_REPORT_EMAIL',
      ENABLED: true
    },
    AUDIT: {
      ENABLED: true,
      MAX_ROWS: 2000
    }
  },

  // ==================== MONITORING & ALERTS ====================
  MONITORING: {
    EMAIL_RECIPIENTS: '',
    ALERT_EMAIL_ONLY: true,
    ALERT_CRITICAL_ONLY: true,
    WEEKLY_SUMMARY: {
      ENABLED: true,
      DAY: 'Monday',
      TIME: '09:00'
    },
    SUMMARY_METRICS: ['quota_usage', 'error_count', 'last_post', 'disabled_features']
  },

  // ==================== CANVA INTEGRATION ====================
  CANVA: {
    TEMPLATE_PROPERTY_PREFIX: 'CANVA_TEMPLATE_',
    PLACEHOLDERS: {
      COMMON: [
        'club_name', 'club_logo', 'match_date', 'opponent', 'venue',
        'home_score', 'away_score', 'competition', 'kick_off_time'
      ],
      GOAL: [
        'goal_scorer', 'assist_provider', 'minute', 'goal_number',
        'match_score', 'celebration_text'
      ],
      CARD: [
        'player_name', 'card_type', 'minute', 'reason', 'referee_name'
      ],
      FIXTURES: [
        'fixture_count', 'fixture_1_opponent', 'fixture_1_date', 'fixture_1_time',
        'fixture_2_opponent', 'fixture_2_date', 'fixture_2_time',
        'fixture_3_opponent', 'fixture_3_date', 'fixture_3_time',
        'fixture_4_opponent', 'fixture_4_date', 'fixture_4_time',
        'fixture_5_opponent', 'fixture_5_date', 'fixture_5_time'
      ],
      RESULTS: [
        'result_count', 'result_1_opponent', 'result_1_score', 'result_1_outcome',
        'result_2_opponent', 'result_2_score', 'result_2_outcome',
        'result_3_opponent', 'result_3_score', 'result_3_outcome',
        'result_4_opponent', 'result_4_score', 'result_4_outcome',
        'result_5_opponent', 'result_5_score', 'result_5_outcome'
      ],
      PLAYER_STATS: [
        'player_name', 'appearances', 'goals', 'assists', 'minutes',
        'yellow_cards', 'red_cards', 'motm_awards', 'position',
        'goals_per_game', 'minutes_per_goal', 'passing_accuracy'
      ],
      WEEKLY_CONTENT: [
        'content_title', 'content_text', 'background_image', 'overlay_color',
        'quote_text', 'quote_author', 'countdown_days', 'next_match_info'
      ],
      COUNTDOWN: [
        'headline', 'countdown_days', 'opponent', 'match_date',
        'match_time', 'match_competition', 'call_to_action'
      ],
      THROWBACK: [
        'headline', 'year', 'description', 'image_url', 'cta_text'
      ],
      REST_WEEK: [
        'headline', 'message', 'next_fixture_opponent', 'next_fixture_date',
        'call_to_action'
      ],
      MONTHLY_FIXTURES: [
        'month_name', 'fixtures_count', 'standout_fixture', 'call_to_action'
      ],
      MONTHLY_RESULTS: [
        'month_name', 'results_count', 'top_result', 'summary_text'
      ],
      POSTPONED_ALERT: [
        'opponent', 'original_date', 'message', 'rescheduled_date'
      ]
    },
    VARIANT_SETTINGS: {
      MAX_PER_POST_TYPE: 15,
      MIN_RECOMMENDED: 10
    },
    TEMPLATE_VARIANTS: {
      FIXTURES: [
        {
          variant_id: 'fixtures_classic_dark',
          template_id: 'FIX-CL-001',
          name: 'Classic Dark Fixture Board',
          placeholder_bindings: {
            headline: 'static:This Week\'s Fixtures',
            subheadline: 'week_description',
            fixture_count: 'fixture_count',
            primary_opponent: 'primary_fixture.opponent',
            primary_date: 'primary_fixture.date',
            primary_time: 'primary_fixture.time'
          },
          default_text: {
            call_to_action: 'Be there to back your team!'
          },
          style: {
            layout: 'split',
            tone: 'dark'
          },
          tags: ['fixtures', 'weekly']
        },
        {
          variant_id: 'fixtures_grid_highlight',
          template_id: 'FIX-GR-104',
          name: 'Grid Highlight Fixtures',
          placeholder_bindings: {
            headline: 'static:Upcoming Battles',
            feature_fixture: 'fixtures_list[0]',
            fixtures_list: {
              type: 'list',
              source: 'fixtures_list',
              limit: 5
            }
          },
          default_text: {
            strapline: 'All kick-off times UK',
            call_to_action: 'Save the dates'
          },
          style: {
            layout: 'grid',
            tone: 'vibrant'
          },
          tags: ['fixtures', 'grid']
        },
        {
          variant_id: 'fixtures_social_story',
          template_id: 'FIX-ST-207',
          name: 'Story Countdown Fixture',
          placeholder_bindings: {
            headline: 'static:Fixtures Incoming',
            subheadline: 'week_description',
            next_match: 'primary_fixture'
          },
          default_text: {
            call_to_action: 'Share & invite the squad'
          },
          style: {
            layout: 'story',
            tone: 'bold'
          },
          tags: ['fixtures', 'story']
        }
      ],
      RESULTS: [
        {
          variant_id: 'results_scoreline_focus',
          template_id: 'RES-SC-310',
          name: 'Scoreline Focus Recap',
          placeholder_bindings: {
            headline: 'static:Weekend Results',
            top_result: 'primary_result',
            results_list: {
              type: 'list',
              source: 'results_list',
              limit: 5
            }
          },
          default_text: {
            summary: 'Full-time scores from across the club'
          },
          style: {
            layout: 'stacked',
            tone: 'dark'
          },
          tags: ['results']
        },
        {
          variant_id: 'results_momentum',
          template_id: 'RES-MO-122',
          name: 'Momentum Recap',
          placeholder_bindings: {
            headline: 'static:Results Roundup',
            subheadline: 'summary_text',
            hero_result: 'primary_result'
          },
          default_text: {
            call_to_action: 'Relive the key moments'
          },
          style: {
            layout: 'hero',
            tone: 'energetic'
          },
          tags: ['results', 'hero']
        },
        {
          variant_id: 'results_statboard',
          template_id: 'RES-ST-520',
          name: 'Results Statboard',
          placeholder_bindings: {
            headline: 'static:Stats & Results',
            wins: 'statistics.wins',
            draws: 'statistics.draws',
            losses: 'statistics.losses',
            goal_difference: 'statistics.goal_difference'
          },
          default_text: {
            call_to_action: 'Keep the momentum going'
          },
          style: {
            layout: 'statboard',
            tone: 'professional'
          },
          tags: ['results', 'stats']
        }
      ],
      QUOTES: [
        {
          variant_id: 'quotes_motivation',
          template_id: 'QTE-MO-011',
          name: 'Motivation Spotlight',
          placeholder_bindings: {
            headline: 'static:Tuesday Motivation',
            quote_text: 'quote_text',
            quote_author: 'quote_author'
          },
          default_text: {
            call_to_action: 'Pass the motivation on'
          },
          style: {
            layout: 'centered',
            tone: 'inspirational'
          },
          tags: ['quotes']
        },
        {
          variant_id: 'quotes_textured',
          template_id: 'QTE-TX-204',
          name: 'Textured Quote Card',
          placeholder_bindings: {
            headline: 'static:Words to Win',
            quote_text: 'quote_text',
            quote_author: 'quote_author',
            theme: 'inspiration_theme'
          },
          default_text: {
            call_to_action: 'Share your favourite quote'
          },
          style: {
            layout: 'textured',
            tone: 'warm'
          },
          tags: ['quotes', 'engagement']
        }
      ],
      STATS: [
        {
          variant_id: 'stats_monthly_overview',
          template_id: 'STA-MO-301',
          name: 'Monthly Overview Board',
          placeholder_bindings: {
            headline: 'content_title',
            reporting_period: 'reporting_period',
            summary: 'stats_summary'
          },
          default_text: {
            call_to_action: 'Dive into the numbers'
          },
          style: {
            layout: 'dashboard',
            tone: 'analytical'
          },
          tags: ['stats', 'monthly']
        },
        {
          variant_id: 'stats_opposition_focus',
          template_id: 'STA-OP-118',
          name: 'Opposition Focus Sheet',
          placeholder_bindings: {
            headline: 'content_title',
            opponent: 'opponent_name',
            previous_meetings: 'previous_meetings',
            key_players: 'key_players'
          },
          default_text: {
            call_to_action: 'Know the opposition'
          },
          style: {
            layout: 'analysis',
            tone: 'strategic'
          },
          tags: ['stats', 'opposition']
        }
      ],
      THROWBACK: [
        {
          variant_id: 'throwback_polaroid',
          template_id: 'THB-PL-090',
          name: 'Polaroid Throwback',
          placeholder_bindings: {
            headline: 'static:Throwback Thursday',
            year: 'throwback_year',
            description: 'throwback_description',
            image_url: 'image_url'
          },
          default_text: {
            call_to_action: 'Share your memories'
          },
          style: {
            layout: 'collage',
            tone: 'nostalgic'
          },
          tags: ['throwback']
        }
      ],
      COUNTDOWN: [
        {
          variant_id: 'countdown_bold',
          template_id: 'CDN-BD-045',
          name: 'Bold Countdown',
          placeholder_bindings: {
            headline: 'content_title',
            countdown_days: 'countdown_days',
            opponent: 'match_opponent',
            match_date: 'match_date',
            match_time: 'match_time',
            call_to_action: 'anticipation_message'
          },
          default_text: {
            strapline: 'Are you ready?'
          },
          style: {
            layout: 'poster',
            tone: 'electric'
          },
          tags: ['countdown']
        },
        {
          variant_id: 'countdown_story',
          template_id: 'CDN-ST-212',
          name: 'Story Countdown',
          placeholder_bindings: {
            headline: 'content_title',
            countdown_days: 'countdown_days',
            opponent: 'match_opponent',
            match_date: 'match_date'
          },
          default_text: {
            call_to_action: 'Share the hype'
          },
          style: {
            layout: 'story',
            tone: 'high-energy'
          },
          tags: ['countdown', 'story']
        }
      ],
      REST_WEEK: [
        {
          variant_id: 'rest_week_relax',
          template_id: 'RST-RL-030',
          name: 'Rest Week Reminder',
          placeholder_bindings: {
            headline: 'content_title',
            message: 'message',
            next_fixture_opponent: 'next_fixture.opponent',
            next_fixture_date: 'next_fixture.date'
          },
          default_text: {
            call_to_action: 'Recharge and get ready'
          },
          style: {
            layout: 'calm',
            tone: 'relaxed'
          },
          tags: ['rest', 'weekly']
        }
      ],
      MONTHLY_FIXTURES: [
        {
          variant_id: 'monthly_fixtures_digest',
          template_id: 'MON-FX-601',
          name: 'Monthly Fixture Digest',
          placeholder_bindings: {
            month_name: 'month_name',
            fixtures_count: 'fixtures_count',
            standout_fixture: 'fixtures[0]'
          },
          default_text: {
            call_to_action: 'Plan your month of football'
          },
          style: {
            layout: 'digest',
            tone: 'club'
          },
          tags: ['monthly', 'fixtures']
        }
      ],
      MONTHLY_RESULTS: [
        {
          variant_id: 'monthly_results_digest',
          template_id: 'MON-RS-602',
          name: 'Monthly Results Recap',
          placeholder_bindings: {
            month_name: 'month_name',
            results_count: 'results_count',
            top_result: 'results[0]',
            summary_text: 'statistics_summary'
          },
          default_text: {
            call_to_action: 'Relive the highlights'
          },
          style: {
            layout: 'digest',
            tone: 'club'
          },
          tags: ['monthly', 'results']
        }
      ],
      POSTPONED_ALERT: [
        {
          variant_id: 'postponed_notice',
          template_id: 'PST-PN-401',
          name: 'Match Postponed Notice',
          placeholder_bindings: {
            opponent: 'opponent',
            original_date: 'original_date',
            message: 'reason',
            rescheduled_date: 'new_date'
          },
          default_text: {
            call_to_action: 'Stay tuned for updates'
          },
          style: {
            layout: 'alert',
            tone: 'warning'
          },
          tags: ['alert']
        }
      ],
      MATCHDAY: [
        {
          variant_id: 'matchday_motm',
          template_id: 'MCH-MO-715',
          name: 'Matchday Spotlight',
          placeholder_bindings: {
            headline: 'static:Matchday Live',
            feature_player: 'motm_player',
            opponent: 'opponent'
          },
          default_text: {
            call_to_action: 'Follow the updates'
          },
          style: {
            layout: 'spotlight',
            tone: 'matchday'
          },
          tags: ['matchday']
        }
      ]
    }
  },

  BUYER_INTAKE: {
    CLUB_DETAILS: {
      NAME: 'Your Football Club',
      CONTACT: 'media@yourclub.co.uk'  // Configure via buyer intake
    },
    BRAND_COLORS: {
      PRIMARY: '#F05A28',
      SECONDARY: '#0E1A2B',
      ACCENT: '#FFD447',
      NEUTRAL: '#FFFFFF'
    },
    CREST_URLS: {
      PRIMARY: 'https://cdn.yourclub.co.uk/crest-primary.png',  // Configure via buyer intake
      SECONDARY: 'https://cdn.yourclub.co.uk/crest-secondary.png'  // Configure via buyer intake
    },
    TYPOGRAPHY: {
      PRIMARY_FONT: 'Montserrat',
      SECONDARY_FONT: 'Oswald'
    },
    TEXT_OVERRIDES: {
      fixtures: {
        headline: 'Upcoming Club Fixtures',
        call_to_action: 'Secure your spot today'
      },
      results: {
        headline: 'Final Whistle Recap',
        call_to_action: 'Share the victories'
      },
      quotes: {
        headline: 'Fuel for Tuesday',
        call_to_action: 'Tag a teammate who needs this'
      },
      stats: {
        headline: 'Club by the Numbers',
        call_to_action: 'Study the form guide'
      },
      throwback: {
        headline: 'Throwback to Glory',
        call_to_action: 'Comment with your memories'
      },
      countdown: {
        headline: 'Countdown to Kick-off',
        call_to_action: 'Rally the pride'
      },
      rest_week: {
        headline: 'Reset & Refocus',
        call_to_action: 'Train smart this week'
      },
      monthly_fixtures: {
        headline: 'Month of Matches',
        call_to_action: 'Add fixtures to your diary'
      },
      monthly_results: {
        headline: 'Monthly Results Recap',
        call_to_action: 'Celebrate the moments'
      },
      postponed_alert: {
        headline: 'Fixture Postponed',
        call_to_action: 'Keep notifications on for updates'
      },
      matchday: {
        headline: 'Matchday Hub',
        call_to_action: 'Follow live for every update'
      }
    }
  },

  // ==================== LOGGING CONFIGURATION ====================
  LOGGING: {
    ENABLED: true,
    LOG_SHEET_NAME: 'Logs',
    LOG_LEVEL: 'INFO', // DEBUG | INFO | WARN | ERROR
    MAX_LOG_ENTRIES: 10000,
    LOG_RETENTION_DAYS: 30,
    LEVELS: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    },
    CURRENT_LEVEL: 2,
    LOG_CLEANUP_DAYS: 30,

    // Bible compliance: Comprehensive logging required
    FUNCTION_ENTRY_EXIT: true,
    ERROR_STACK_TRACES: true,
    PERFORMANCE_TIMING: true,
    AUDIT_TRAIL: true
  },

  // ==================== PERFORMANCE SETTINGS ====================
  PERFORMANCE: {
    CACHE_ENABLED: true,
    CACHE_DURATION_MINUTES: 30,
    BATCH_SIZE: 50,
    WEBHOOK_RATE_LIMIT_MS: 1000, // Min time between webhook calls
    SHEET_LOCK_TIMEOUT_MS: 30000,
    PROCESSING_DELAY_MS: 500,
    API_RATE_LIMIT_MS: 500
  },

  // ==================== PLAYER DIRECTORY SETTINGS ====================
  PLAYERS: {
    OPPOSITION_ENTRIES: ['Goal', 'Opposition', 'Own Goal', 'Unknown'],
    POSITIONS: [
      'Goalkeeper', 'Right Back', 'Centre Back', 'Left Back',
      'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
      'Right Winger', 'Left Winger', 'Striker', 'Centre Forward'
    ],
    CARD_TYPES: ['Yellow Card', 'Red Card', 'Sin Bin', '2nd Yellow (Red)'],
    MATCH_DURATION_MINUTES: 90,
    HALF_TIME_MINUTE: 45,
    STAT_FIELDS: [
      'appearances', 'goals', 'assists', 'minutes', 'yellow_cards',
      'red_cards', 'motm', 'goals_per_game', 'minutes_per_goal'
    ]
  },

  // ==================== PLAYER MANAGEMENT ====================
  PLAYER_MANAGEMENT: {
    AUTO_CALCULATE_MINUTES: true,
    AUTO_UPDATE_STATS: true,
    STARTER_VS_SUB_TRACKING: true,
    SUB_SWAP_ENABLED: true,
    
    // Minutes calculation settings
    MATCH_DURATION_MINUTES: 90,
    INJURY_TIME_DEFAULT: 5,
    
    // Stats calculation frequency
    STATS_UPDATE_FREQUENCY: 'real_time', // real_time | batch | manual
    BI_MONTHLY_STATS_DAY: 14 // 14th of every other month
  },

  // ==================== VIDEO INTEGRATION ====================
  VIDEO: {
    ENABLED: false, // Enable when ready
    AUTO_CLIP_CREATION: true,
    DEFAULT_CLIP_DURATION: 30,

    // Clip buffers per event type (Bible compliance defaults)
    CLIP_BUFFERS: {
      GOAL: { preSeconds: 10, postSeconds: 20 },
      CARD: { preSeconds: 5, postSeconds: 10 },
      BIG_CHANCE: { preSeconds: 10, postSeconds: 15 }
    },

    // Folder structure
    DRIVE_FOLDER_ID: '', // Set when configured
    DRIVE_FOLDER_PROPERTY: 'VIDEO_DRIVE_FOLDER_ID',
    PLAYER_FOLDERS_AUTO_CREATE: true,
    PLAYER_FOLDERS_PROPERTY: 'PLAYER_FOLDERS_MAPPING',
    MATCH_FOLDER_PREFIX: 'Match Highlights',

    // Processing options
    PROCESSING_METHOD: 'cloudconvert', // cloudconvert | ffmpeg_local
    YOUTUBE_AUTO_UPLOAD: false,
    YOUTUBE_DEFAULT_PRIVACY: 'unlisted',
    YOUTUBE_CHANNEL_PROPERTY: 'YOUTUBE_CHANNEL_ID',
    YOUTUBE_PLAYLIST_PROPERTY: 'YOUTUBE_PLAYLIST_ID',
    DEFAULT_PRIVACY_STATUS: 'unlisted',
    CLOUDCONVERT_API_KEY_PROPERTY: 'CLOUDCONVERT_API_KEY',

    // Video editor notes
    NOTE_TYPES: ['big_chance', 'goal', 'skill', 'good_play', 'card', 'other']
  },

  // ==================== XBOTGO INTEGRATION ====================
  XBOTGO: {
    ENABLED: false, // Enable when API configured
    API_URL: '',
    API_KEY_PROPERTY: 'XBOTGO_API_KEY',
    API_BASE_URL_PROPERTY: 'XBOTGO_API_URL',
    SCOREBOARD_ID: '',
    DEVICE_ID_PROPERTY: 'XBOTGO_DEVICE_ID',

    // Update settings
    AUTO_SCORE_UPDATE: true,
    UPDATE_ON_GOAL: true,
    UPDATE_ON_FINAL: true,
    RETRY_ATTEMPTS: 3,
    AUTO_PUSH_GOALS: true,
    AUTO_PUSH_CARDS: false,
    AUTO_PUSH_SUBS: false,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  },

  // ==================== WEEKLY SCHEDULE CONFIGURATION ====================
  WEEKLY_SCHEDULE: {
    ENABLED: true, // Bible compliance requirement
    TIMEZONE: 'Europe/London',
    COUNTDOWN: {
      LOOKAHEAD_DAYS: 10,
      SUPPRESS_ON_POSTPONED: true,
      CONTROL_PANEL_FLAG: 'COUNTDOWN_POSTS'
    },
    ROTATION: {
      QUOTES_PROPERTY_KEY: 'WEEKLY_QUOTES_ROTATION',
      THROWBACK_PROPERTY_KEY: 'WEEKLY_THROWBACK_ROTATION'
    },

    QUOTE_VALIDATION: {
      MAX_LENGTH_PROPERTY: 'WEEKLY_QUOTES_MAX_LENGTH',
      DEFAULT_MAX_LENGTH: 220,
      ALLOW_TRUNCATION: true
    },

    BIRTHDAYS: {
      ENABLED_PROPERTY: 'BIRTHDAY_AUTOMATION_ENABLED',
      DEFAULT_ENABLED: true,
      SHEET_NAME_PROPERTY: 'BIRTHDAY_SHEET_NAME',
      DEFAULT_SHEET_NAME: 'Players',
      NAME_HEADERS: ['Player Name', 'Full Name', 'Name'],
      DOB_HEADERS: ['Date of Birth', 'DOB', 'Birthdate'],
      POSITION_HEADERS: ['Position'],
      SQUAD_NUMBER_HEADERS: ['Squad Number', '#'],
      LAST_RUN_PROPERTY: 'BIRTHDAY_AUTOMATION_LAST_RUN',
      PROCESSED_PREFIX: 'BIRTHDAY_PROCESSED_',
      ALLOW_MULTIPLE_PER_DAY: true
    },

    // Schedule definitions (Bible compliance)
    SCHEDULE: {
      MONDAY: {
        enabled: true,
        content_type: 'fixtures_or_no_match',
        post_time: '18:00',
        fallback_message: 'No match scheduled this week'
      },
      TUESDAY: {
        enabled: true,
        content_type: 'quotes',
        post_time: '19:00',
        quote_categories: ['motivation', 'teamwork', 'football']
      },
      WEDNESDAY: {
        enabled: true,
        content_type: 'stats_or_opposition',
        post_time: '20:00',
        monthly_stats_preference: true
      },
      THURSDAY: {
        enabled: true,
        content_type: 'throwback_or_countdown',
        post_time: '19:30',
        countdown_trigger_days: 3
      },
      FRIDAY: {
        enabled: true,
        content_type: 'countdown_2_days',
        post_time: '18:30'
      },
      SATURDAY: {
        enabled: true,
        content_type: 'countdown_1_day',
        post_time: '19:00'
      },
      SUNDAY: {
        enabled: true,
        content_type: 'match_day',
        varies_by_kickoff: true
      }
    },

    LEGACY_SCHEDULE: {
      1: {
        type: 'fixtures',
        content: 'this_week_fixtures',
        fallback: 'no_match_scheduled',
        enabled: true
      },
      2: {
        type: 'quotes',
        content: 'motivational_quotes',
        rotation: true,
        enabled: true
      },
      3: {
        type: 'stats_or_opposition',
        content: 'monthly_stats',
        monthly_week: 2,
        enabled: true
      },
      4: {
        type: 'throwback',
        content: 'historical_content',
        countdown_if_match: true,
        enabled: true
      },
      5: {
        type: 'countdown',
        content: '2_days_to_go',
        only_if_match: true,
        enabled: true
      },
      6: {
        type: 'countdown',
        content: '1_day_to_go',
        only_if_match: true,
        enabled: true
      },
      0: {
        type: 'match_day',
        content: 'live_match_automation',
        priority: 'highest',
        enabled: true
      }
    },

    QUOTES_ROTATION_PROPERTY: 'LAST_QUOTE_INDEX',
    THROWBACK_ROTATION_PROPERTY: 'LAST_THROWBACK_INDEX',
    CONTENT_COOLDOWN_DAYS: 30
  },

  // ==================== MONTHLY CONTENT CONFIGURATION ====================
  MONTHLY_CONTENT: {
    ENABLED: true,

    // Fixtures summary
    FIXTURES_SUMMARY: {
      enabled: true,
      post_date: 1, // 1st of month
      include_all_competitions: true,
      highlight_key_matches: true
    },

    // Results summary
    RESULTS_SUMMARY: {
      enabled: true,
      post_date: 'last_day', // Last day of month
      include_statistics: true,
      highlight_best_worst: true
    },

    // Player stats (bi-monthly as per spec)
    PLAYER_STATS: {
      enabled: true,
      frequency: 'bi_monthly', // Every 2nd week
      post_date: 14, // 14th of every other month
      include_all_stats: true,
      minimum_appearances: 1
    }
  },

  LEAGUE_TABLE_PIPELINE: {
    RAW_SHEET_NAME: 'League Raw',
    SORTED_SHEET_NAME: 'League Sorted',
    CANVA_SHEET_NAME: 'League Canva Map',
    SORT_HEADERS: ['Position', 'Team', 'Played', 'Won', 'Drawn', 'Lost', 'Goals For', 'Goals Against', 'Goal Difference', 'Points'],
    CANVA_HEADERS: ['Position', 'Team', 'Played', 'Points', 'Goal Difference'],
    REQUIRED_COLUMNS: ['Team', 'Played', 'Won', 'Drawn', 'Lost', 'Goals For', 'Goals Against', 'Goal Difference', 'Points'],
    HTML_FILE_NAME: 'table.html',
    DRIVE_FOLDER_PROPERTY: 'LEAGUE_TABLE_FOLDER_ID',
    LAST_BUILD_PROPERTY: 'LEAGUE_TABLE_LAST_BUILD',
    TITLE_TEXT: 'League Table',
    STAMP_PROPERTY: 'LEAGUE_TABLE_HTML_HASH'
  },

  // ==================== MONTHLY EVENTS (LEGACY SUPPORT) ====================
  MONTHLY: {
    GOTM: {
      VOTING_PERIOD_DAYS: 5,
      MIN_GOALS_FOR_COMPETITION: 3,
      VOTING_START_DAY: 1,
      WINNER_ANNOUNCE_DAY: 6,
      ENABLED: true
    },
    GOTS: {
      VOTING_DURATION_DAYS: 14,
      MIN_CANDIDATES_FOR_COMPETITION: 6, // Need 6 goals (1st & 2nd from 3+ months)
      ENABLED: true
    },
    SUMMARIES: {
      FIXTURES_DAY: 1,
      RESULTS_DAY: -1,
      STATS_WEEK: 2,
      ENABLED: true
    }
  },
  // ==================== MONTHLY SUMMARY SETTINGS ====================
  MONTHLY_SUMMARIES: {
    ENABLED: true,
    CACHE_TTL_SECONDS: 21600,
    MAX_FIXTURES_PER_PAYLOAD: 10,
    MAX_RESULTS_PER_PAYLOAD: 10,
    LOCAL_RIVALS: ['leicester', 'melton', 'oadby', 'hinckley', 'coalville'],
    IMPORTANT_COMPETITIONS: ['league cup', 'fa cup', 'county cup']
  },

  // ==================== OPPOSITION HANDLING ====================
  OPPOSITION_HANDLING: {
    // Bible compliance: Auto-detection required
    AUTO_GOAL_DETECTION: true, // "Goal" player = opposition goal
    AUTO_CARD_DETECTION: true, // "Opposition" player = opposition card
    
    // Detection keywords
    GOAL_KEYWORDS: ['Goal', 'goal', 'GOAL'],
    OPPOSITION_KEYWORDS: ['Opposition', 'opposition', 'OPPOSITION'],
    
    // Posting preferences
    POST_OPPOSITION_GOALS: true,
    POST_OPPOSITION_CARDS: true,
    
    // Event handling
    UPDATE_SCORE_ONLY: true, // Don't update our player stats
    TRACK_SEPARATELY: true // Keep opposition events separate
  },

  // ==================== VALIDATION RULES ====================
  VALIDATION: {
    REQUIRED_FIELDS: {
      GOAL: ['minute', 'player'],
      CARD: ['minute', 'player', 'card_type'],
      SUBSTITUTION: ['minute', 'player_off', 'player_on']
    },
    
    MINUTE_RANGE: {
      MIN: 1,
      MAX: 120 // Including extra time
    },
    
    DUPLICATE_PREVENTION: {
      ENABLED: true,
      CHECK_WINDOW_MINUTES: 5,
      KEY_FIELDS: ['match_id', 'minute', 'player', 'event_type']
    }
  },

  // ==================== ERROR HANDLING ====================
  ERROR_HANDLING: {
    GRACEFUL_FALLBACKS: true,
    RETRY_LOGIC: true,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000,
    DEFAULT_MAX_RETRIES: 3,
    DEFAULT_RETRY_DELAY: 1000,
    EXPONENTIAL_BACKOFF: true,
    CONTINUE_ON_ERROR: true,

    // Missing data handling
    HANDLE_MISSING_SHEETS: true,
    HANDLE_MISSING_PLAYERS: true,
    HANDLE_MISSING_CONFIG: true,

    // Error reporting
    LOG_ALL_ERRORS: true,
    ALERT_ON_CRITICAL: false, // Set to true for production monitoring
    ALERT_ON_CRITICAL_ERROR: true,
    ADMIN_EMAIL_PROPERTY: 'ADMIN_EMAIL',
    CRITICAL_ERRORS: [
      'SHEET_ACCESS_DENIED',
      'WEBHOOK_PERMANENTLY_FAILED',
      'CONFIG_CORRUPTION'
    ]
  },

  // ==================== SECURITY SETTINGS ====================
  SECURITY: {
    // Authentication settings
    AUTHENTICATION: {
      ENABLED: true,
      MIN_PASSWORD_LENGTH: 12,
      REQUIRE_PASSWORD_COMPLEXITY: true,
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MS: 900000 // 15 minutes
    },

    // Session timeout configuration
    SESSION_TIMEOUT: {
      HARD_TIMEOUT_MS: 14400000, // 4 hours
      INACTIVITY_TIMEOUT_MS: 1800000, // 30 minutes
      WARNING_THRESHOLD_MS: 300000, // 5 minutes before timeout
      EXTENSION_INCREMENT_MS: 1800000, // 30 minutes extension
      MAX_CONCURRENT_SESSIONS: 3,
      CLEANUP_INTERVAL_MS: 3600000 // 1 hour
    },

    // Input validation settings
    INPUT_VALIDATION: {
      ENABLED: true,
      XSS_PROTECTION: true,
      SQL_INJECTION_PROTECTION: true,
      MAX_INPUT_LENGTH: 1000,
      ALLOWED_HTML_TAGS: []
    },

    // Access control
    ACCESS_CONTROL: {
      REQUIRE_HTTPS: true,
      ALLOWED_DOMAINS: [],
      BLOCKED_IPS: [],
      RATE_LIMITING: {
        ENABLED: true,
        REQUESTS_PER_MINUTE: 60,
        REQUESTS_PER_HOUR: 1000
      }
    }
  },

  // ==================== DEVELOPMENT SETTINGS ====================
  DEVELOPMENT: {
    DEBUG_MODE: false,
    VERBOSE_LOGGING: false,
    USE_TEST_DATA: false,
    TEST_WEBHOOK_URL_PROPERTY: 'TEST_WEBHOOK_URL',
    SIMULATION_MODE: false,
    SIMULATION_LOG_PAYLOADS: true
  }
};

// ==================== RUNTIME CONFIG OVERRIDES ====================

const RUNTIME_CONFIG_CACHE_DEFAULT_TTL_MS = 60 * 1000;
let runtimeConfigCache_ = null;
let runtimeConfigCacheTimestamp_ = 0;

const RUNTIME_CONFIG_OVERRIDE_DEFINITIONS = {
  'SYSTEM.CLUB_NAME': { paths: ['SYSTEM.CLUB_NAME', 'CUSTOMER.DEFAULT_PROFILE.clubName'] },
  'SYSTEM.CLUB_SHORT_NAME': { paths: ['SYSTEM.CLUB_SHORT_NAME', 'CUSTOMER.DEFAULT_PROFILE.clubShortName'] },
  'SYSTEM.LEAGUE': { paths: ['SYSTEM.LEAGUE', 'CUSTOMER.DEFAULT_PROFILE.league'] },
  'SYSTEM.LEAGUE_NAME': { paths: ['SYSTEM.LEAGUE', 'CUSTOMER.DEFAULT_PROFILE.league'] },
  'SYSTEM.AGE_GROUP': { paths: ['SYSTEM.AGE_GROUP', 'CUSTOMER.DEFAULT_PROFILE.ageGroup'] },
  'SYSTEM.SEASON': { paths: ['SYSTEM.SEASON'] },
  'SYSTEM.ENVIRONMENT': { paths: ['SYSTEM.ENVIRONMENT'] },
  'SYSTEM.TIMEZONE': { paths: ['SYSTEM.TIMEZONE'] },
  'CUSTOMER.TEAM_NAME': { paths: ['SYSTEM.CLUB_NAME', 'CUSTOMER.DEFAULT_PROFILE.clubName'] },
  'CUSTOMER.TEAM_SHORT': { paths: ['SYSTEM.CLUB_SHORT_NAME', 'CUSTOMER.DEFAULT_PROFILE.clubShortName'] },
  'CUSTOMER.LEAGUE_NAME': { paths: ['SYSTEM.LEAGUE', 'CUSTOMER.DEFAULT_PROFILE.league'] },
  'CUSTOMER.AGE_GROUP': { paths: ['SYSTEM.AGE_GROUP', 'CUSTOMER.DEFAULT_PROFILE.ageGroup'] },
  'CUSTOMER.SEASON': { paths: ['SYSTEM.SEASON'] },
  'CUSTOMER.HOME_COLOUR': { paths: ['BRANDING.PRIMARY_COLOR', 'CUSTOMER.DEFAULT_PROFILE.primaryColor'] },
  'CUSTOMER.AWAY_COLOUR': { paths: ['BRANDING.SECONDARY_COLOR', 'CUSTOMER.DEFAULT_PROFILE.secondaryColor'] },
  'CUSTOMER.BADGE_URL': { paths: ['BRANDING.BADGE_URL', 'CUSTOMER.DEFAULT_PROFILE.badgeUrl'] },
  'CUSTOMER.HOME_VENUE': { paths: ['CUSTOMER.DEFAULT_PROFILE.homeVenue'] },
  'CUSTOMER.CONTACT_EMAIL': { paths: ['CUSTOMER.DEFAULT_PROFILE.contactEmail'] },
  'CUSTOMER.ACTIVE_PROFILE': {
    paths: ['CUSTOMER.ACTIVE_PROFILE'],
    transform: function(value) {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('Failed to parse CUSTOMER.ACTIVE_PROFILE override', error);
        }
      }
      return value;
    }
  },
  TEAM_NAME: { paths: ['SYSTEM.CLUB_NAME', 'CUSTOMER.DEFAULT_PROFILE.clubName'] },
  TEAM_SHORT: { paths: ['SYSTEM.CLUB_SHORT_NAME', 'CUSTOMER.DEFAULT_PROFILE.clubShortName'] },
  LEAGUE_NAME: { paths: ['SYSTEM.LEAGUE', 'CUSTOMER.DEFAULT_PROFILE.league'] },
  PRIMARY_COLOR: { paths: ['BRANDING.PRIMARY_COLOR', 'CUSTOMER.DEFAULT_PROFILE.primaryColor'] },
  SECONDARY_COLOR: { paths: ['BRANDING.SECONDARY_COLOR', 'CUSTOMER.DEFAULT_PROFILE.secondaryColor'] },
  BADGE_URL: { paths: ['BRANDING.BADGE_URL', 'CUSTOMER.DEFAULT_PROFILE.badgeUrl'] },
  AGE_GROUP: { paths: ['SYSTEM.AGE_GROUP', 'CUSTOMER.DEFAULT_PROFILE.ageGroup'] },
  SEASON: { paths: ['SYSTEM.SEASON'] },
  TIMEZONE: { paths: ['SYSTEM.TIMEZONE'] },
  CONTACT_EMAIL: { paths: ['CUSTOMER.DEFAULT_PROFILE.contactEmail'] }
};

function invalidateRuntimeConfigCache_() {
  runtimeConfigCache_ = null;
  runtimeConfigCacheTimestamp_ = 0;
}

function deepCloneConfig_(config) {
  try {
    return JSON.parse(JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to clone config for runtime hydration', error);
    return config;
  }
}

function setNestedValueOnObject_(target, path, value) {
  if (!target || !path) {
    return;
  }

  const segments = path.split('.');
  let current = target;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!Object.prototype.hasOwnProperty.call(current, segment) || typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function applyOverrideDefinition_(config, key, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return false;
  }

  const trimmedKey = typeof key === 'string' ? key.trim() : key;
  const definition = RUNTIME_CONFIG_OVERRIDE_DEFINITIONS[trimmedKey] || RUNTIME_CONFIG_OVERRIDE_DEFINITIONS[String(trimmedKey).toUpperCase()];

  if (definition) {
    let value = rawValue;
    if (typeof definition.transform === 'function') {
      value = definition.transform(rawValue, trimmedKey);
    }

    const paths = Array.isArray(definition.paths) ? definition.paths : [definition.paths];
    paths.forEach(path => {
      if (!path) {
        return;
      }
      setNestedValueOnObject_(config, path, value);
    });
    return true;
  }

  if (typeof trimmedKey === 'string' && trimmedKey.indexOf('.') !== -1) {
    setNestedValueOnObject_(config, trimmedKey, rawValue);
    return true;
  }

  return false;
}

function applyScriptPropertyOverrides_(config) {
  if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties) {
    return;
  }

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const allProperties = scriptProperties.getProperties ? scriptProperties.getProperties() : {};

    Object.keys(allProperties || {}).forEach(key => {
      applyOverrideDefinition_(config, key, allProperties[key]);
    });
  } catch (error) {
    console.warn('Failed to hydrate script property overrides', error);
  }
}

function applyDynamicConfigOverrides_(config) {
  if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties) {
    return;
  }

  const cacheKey = typeof CONFIG_CACHE_KEY !== 'undefined' ? CONFIG_CACHE_KEY : 'APP_CONFIG_CACHE';
  const ttl = typeof CONFIG_CACHE_TTL_MS !== 'undefined' ? CONFIG_CACHE_TTL_MS : RUNTIME_CONFIG_CACHE_DEFAULT_TTL_MS;

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const cachedValue = scriptProperties.getProperty ? scriptProperties.getProperty(cacheKey) : null;

    if (!cachedValue) {
      return;
    }

    const parsed = JSON.parse(cachedValue);
    if (parsed && parsed._ts && (Date.now() - parsed._ts) > ttl) {
      return;
    }

    Object.keys(parsed || {}).forEach(key => {
      if (key === '_ts') {
        return;
      }
      applyOverrideDefinition_(config, key, parsed[key]);
    });
  } catch (error) {
    console.warn('Failed to hydrate dynamic config overrides', error);
  }
}

function getHydratedConfig_(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && runtimeConfigCache_ && (now - runtimeConfigCacheTimestamp_) < RUNTIME_CONFIG_CACHE_DEFAULT_TTL_MS) {
    return runtimeConfigCache_;
  }

  const hydrated = deepCloneConfig_(SYSTEM_CONFIG);
  applyScriptPropertyOverrides_(hydrated);
  applyDynamicConfigOverrides_(hydrated);

  runtimeConfigCache_ = hydrated;
  runtimeConfigCacheTimestamp_ = now;

  return runtimeConfigCache_;
}

// ==================== CONFIGURATION UTILITIES ====================

function clearConfigOverrideCache_() {
  CONFIG_SCRIPT_PROPERTY_CACHE = null;
  CONFIG_SCRIPT_PROPERTY_CACHE_EXPIRES_AT = 0;
}

function getScriptPropertyOverrides_() {
  if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties) {
    return {};
  }

  const now = Date.now();
  if (CONFIG_SCRIPT_PROPERTY_CACHE && now < CONFIG_SCRIPT_PROPERTY_CACHE_EXPIRES_AT) {
    return CONFIG_SCRIPT_PROPERTY_CACHE;
  }

  try {
    const properties = PropertiesService.getScriptProperties().getProperties() || {};
    CONFIG_SCRIPT_PROPERTY_CACHE = properties;
    CONFIG_SCRIPT_PROPERTY_CACHE_EXPIRES_AT = now + CONFIG_SCRIPT_PROPERTY_CACHE_TTL_MS;
    return CONFIG_SCRIPT_PROPERTY_CACHE;
  } catch (error) {
    CONFIG_LOGGER.error('Failed to load script property overrides', error);
    clearConfigOverrideCache_();
    return {};
  }
}

function coerceConfigOverrideValue_(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }

  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed === 'true';
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      CONFIG_LOGGER.error('Failed to parse JSON config override', { value: trimmed, error });
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Get configuration value by path
 * @param {string} path - Dot notation path (e.g., 'SYSTEM.VERSION')
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
function getConfigValue(path, defaultValue = null) {
  try {
    const overrides = getScriptPropertyOverrides_();
    if (Object.prototype.hasOwnProperty.call(overrides, path)) {
      return coerceConfigOverrideValue_(overrides[path]);
    }

    const legacyKey = path.replace(/\./g, '_');
    if (Object.prototype.hasOwnProperty.call(overrides, legacyKey)) {
      return coerceConfigOverrideValue_(overrides[legacyKey]);
    }

    const parts = path.split('.');
    let value = SYSTEM_CONFIG;
    const hydratedConfig = getHydratedConfig_();
    const parts = path.split('.');
    let value = hydratedConfig;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }

    return value;
  } catch (error) {
    console.error(`Failed to get config for path: ${path}`, error);
    return defaultValue;
  }
}

/**
 * @deprecated Use getConfigValue instead. Maintained for backward compatibility.
 * @param {string} path
 * @param {*} defaultValue
 * @returns {*} Configuration value
 */
function getConfig(path, defaultValue = null) {
  return getConfigValue(path, defaultValue);
}

/**
 * Set configuration value by path
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 * @returns {boolean} Success status
 */
function setConfig(path, value) {
  try {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = SYSTEM_CONFIG;
    
    // Navigate to parent object
    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    current[lastPart] = value;
    invalidateRuntimeConfigCache_();
    return true;
  } catch (error) {
    console.error(`Failed to set config for path: ${path}`, error);
    return false;
  }
}

/**
 * Check if feature is enabled
 * @param {string} featureName - Feature name from FEATURES object
 * @returns {boolean} Feature enabled status
 */
function isFeatureEnabled(featureName) {
  return getConfigValue(`FEATURES.${featureName}`, false) === true;
}

/**
 * Get webhook URL from Properties Service
 * @returns {string|null} Webhook URL or null if not set
 */
function getWebhookUrl() {
  try {
    const propertyName = getConfigValue('MAKE.WEBHOOK_URL_PROPERTY');
    return PropertiesService.getScriptProperties().getProperty(propertyName);
  } catch (error) {
    console.error('Failed to get webhook URL:', error);
    return null;
  }
}

/**
 * Validate configuration on startup
 * @returns {Object} Validation result
 */
function validateConfiguration() {
  const issues = [];
  const warnings = [];
  
  // Check required webhook URL
  if (!getWebhookUrl()) {
    issues.push('Webhook URL not configured');
  }
  
  // Check feature dependencies
  if (isFeatureEnabled('VIDEO_INTEGRATION') && !getConfigValue('VIDEO.DRIVE_FOLDER_ID')) {
    warnings.push('Video integration enabled but no Drive folder configured');
  }
  
  if (isFeatureEnabled('XBOTGO_INTEGRATION') && !getConfigValue('XBOTGO.API_URL')) {
    warnings.push('XbotGo integration enabled but no API URL configured');
  }
  
  // Check Bible compliance
  if (!getConfigValue('SYSTEM.BIBLE_COMPLIANT')) {
    issues.push('System not configured for Bible compliance');
  }
  
  return {
    valid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    timestamp: new Date().toISOString()
  };
}

// ==================== BUYER CONFIGURATION MANAGEMENT ====================

/**
 * Ensure buyer profile ID exists
 * @returns {string} Buyer profile ID
 */
function ensureBuyerProfileId() {
  try {
    if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties) {
      return getConfigValue('CUSTOMER.DEFAULT_PROFILE').buyerId;
    }

    const propertyKeys = getConfigValue('CUSTOMER.PROPERTY_KEYS');
    const scriptProperties = PropertiesService.getScriptProperties();

    // @testHook(buyer_profile_id_read_start)
    let buyerId = scriptProperties.getProperty(propertyKeys.PROFILE_ID);
    // @testHook(buyer_profile_id_read_complete)

    if (!buyerId) {
      buyerId = (typeof Utilities !== 'undefined' && Utilities.getUuid)
        ? Utilities.getUuid()
        : StringUtils.generateId('buyer');

      // @testHook(buyer_profile_id_write_start)
      scriptProperties.setProperty(propertyKeys.PROFILE_ID, buyerId);
      // @testHook(buyer_profile_id_write_complete)
    }

    return buyerId;
  } catch (error) {
    console.error('Failed to ensure buyer profile ID:', error);
    return getConfigValue('CUSTOMER.DEFAULT_PROFILE').buyerId;
  }
}

/**
 * Retrieve stored buyer profile
 * @param {boolean} useDefaults - Fallback to defaults when missing
 * @returns {Object|null} Buyer profile
 */
function getBuyerProfile(useDefaults = true) {
  try {
    const defaults = JSON.parse(JSON.stringify(getConfigValue('CUSTOMER.DEFAULT_PROFILE')));

    if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties) {
      return useDefaults ? defaults : null;
    }

    const propertyKeys = getConfigValue('CUSTOMER.PROPERTY_KEYS');
    const scriptProperties = PropertiesService.getScriptProperties();

    // @testHook(buyer_profile_properties_read_start)
    const storedProfile = scriptProperties.getProperty(propertyKeys.PROFILE);
    // @testHook(buyer_profile_properties_read_complete)

    if (!storedProfile) {
      return useDefaults ? defaults : null;
    }

    const parsedProfile = JSON.parse(storedProfile);

    // Optionally include badge asset from dedicated storage
    // @testHook(buyer_badge_properties_read_start)
    const badgeBase64 = scriptProperties.getProperty(propertyKeys.BADGE_BASE64);
    // @testHook(buyer_badge_properties_read_complete)

    if (badgeBase64) {
      parsedProfile.badgeBase64 = badgeBase64;
    }

    return Object.assign({}, defaults, parsedProfile);
  } catch (error) {
    console.error('Failed to load buyer profile:', error);
    return useDefaults ? JSON.parse(JSON.stringify(getConfigValue('CUSTOMER.DEFAULT_PROFILE'))) : null;
  }
}

/**
 * Apply buyer profile to runtime configuration
 * @param {Object} profile - Buyer profile data
 * @returns {Object} Result of application
 */
function applyBuyerProfileToSystem(profile) {
  CONFIG_LOGGER.enterFunction('applyBuyerProfileToSystem');

  try {
    if (!profile || typeof profile !== 'object') {
      CONFIG_LOGGER.exitFunction('applyBuyerProfileToSystem', { success: false, reason: 'invalid_profile' });
      return { success: false, reason: 'invalid_profile' };
    }

    const resolvedProfile = Object.assign({}, getConfigValue('CUSTOMER.DEFAULT_PROFILE'), profile);
    const nowIso = new Date().toISOString();
    resolvedProfile.updatedAt = resolvedProfile.updatedAt || nowIso;

    const warnings = [];
    const requiredFields = ['clubName', 'league', 'ageGroup'];
    requiredFields.forEach(field => {
      if (!resolvedProfile[field]) {
        warnings.push(`missing_${field}`);
      }
    });

    if (warnings.length > 0) {
      console.warn('Buyer profile missing recommended fields', warnings);
    }

    const scriptPropertyUpdates = {};
    const registerOverride = function(path, value, aliases = []) {
      if (value === undefined || value === null || value === '') {
        return;
      }
      setConfig(path, value);
      scriptPropertyUpdates[path] = value;
      if (Array.isArray(aliases)) {
        aliases.forEach(alias => {
          if (alias) {
            scriptPropertyUpdates[alias] = value;
          }
        });
      }
    };

    registerOverride('SYSTEM.CLUB_NAME', resolvedProfile.clubName || getConfigValue('SYSTEM.CLUB_NAME'), ['CUSTOMER.TEAM_NAME']);
    registerOverride('SYSTEM.CLUB_SHORT_NAME', resolvedProfile.clubShortName || resolvedProfile.clubName || getConfigValue('SYSTEM.CLUB_SHORT_NAME'), ['CUSTOMER.TEAM_SHORT']);
    registerOverride('SYSTEM.LEAGUE', resolvedProfile.league || getConfigValue('SYSTEM.LEAGUE'), ['CUSTOMER.LEAGUE_NAME']);
    registerOverride('SYSTEM.AGE_GROUP', resolvedProfile.ageGroup || getConfigValue('SYSTEM.AGE_GROUP'), ['CUSTOMER.AGE_GROUP']);
    registerOverride('SYSTEM.SEASON', resolvedProfile.season || profile.season || getConfigValue('SYSTEM.SEASON'), ['CUSTOMER.SEASON']);
    registerOverride('SYSTEM.LAST_UPDATED', nowIso);

    registerOverride('BRANDING.PRIMARY_COLOR', resolvedProfile.primaryColor, ['CUSTOMER.HOME_COLOUR']);
    registerOverride('BRANDING.SECONDARY_COLOR', resolvedProfile.secondaryColor, ['CUSTOMER.AWAY_COLOUR']);
    registerOverride('BRANDING.BADGE_URL', resolvedProfile.badgeUrl, ['CUSTOMER.BADGE_URL']);
    registerOverride('BRANDING.LAST_ASSET_UPDATE', nowIso);

  if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
    try {
      const updates = {};
      if (resolvedProfile.clubName) {
        updates['SYSTEM.CLUB_NAME'] = String(resolvedProfile.clubName);
        updates.CLUB_NAME = String(resolvedProfile.clubName); // legacy alias
      }
      if (resolvedProfile.clubShortName) {
        updates['SYSTEM.CLUB_SHORT_NAME'] = String(resolvedProfile.clubShortName);
      }
      if (resolvedProfile.league) {
        updates['SYSTEM.LEAGUE'] = String(resolvedProfile.league);
        updates['SYSTEM.LEAGUE_NAME'] = String(resolvedProfile.league);
      }
      if (resolvedProfile.ageGroup) {
        updates['SYSTEM.AGE_GROUP'] = String(resolvedProfile.ageGroup);
      }
      if (resolvedProfile.primaryColor) {
        updates['BRANDING.PRIMARY_COLOR'] = String(resolvedProfile.primaryColor);
      }
      if (resolvedProfile.secondaryColor) {
        updates['BRANDING.SECONDARY_COLOR'] = String(resolvedProfile.secondaryColor);
      }
      if (resolvedProfile.badgeUrl) {
        updates['BRANDING.BADGE_URL'] = String(resolvedProfile.badgeUrl);
      }

      if (Object.keys(updates).length) {
        PropertiesService.getScriptProperties().setProperties(updates, false);
        clearConfigOverrideCache_();
      }
    } catch (error) {
      CONFIG_LOGGER.error('Failed to persist buyer profile overrides to script properties', error);
    }
  }

  return {
    success: true,
    profile: resolvedProfile
  };
    if (resolvedProfile.homeVenue) {
      scriptPropertyUpdates['CUSTOMER.HOME_VENUE'] = resolvedProfile.homeVenue;
    }

    if (resolvedProfile.contactEmail) {
      scriptPropertyUpdates['CUSTOMER.CONTACT_EMAIL'] = resolvedProfile.contactEmail;
    }

    setConfig('CUSTOMER.ACTIVE_PROFILE', resolvedProfile);
    const profileToPersist = JSON.parse(JSON.stringify(resolvedProfile));
    if (profileToPersist.badgeBase64) {
      delete profileToPersist.badgeBase64;
    }
    scriptPropertyUpdates['CUSTOMER.ACTIVE_PROFILE'] = JSON.stringify(profileToPersist);
    scriptPropertyUpdates['CUSTOMER.PROFILE_LAST_UPDATED'] = nowIso;

    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      const scriptProperties = PropertiesService.getScriptProperties();
      scriptProperties.setProperties(scriptPropertyUpdates, false);
    }

    invalidateRuntimeConfigCache_();

    CONFIG_LOGGER.exitFunction('applyBuyerProfileToSystem', {
      success: true,
      warnings: warnings
    });

    return {
      success: true,
      profile: resolvedProfile,
      warnings: warnings
    };
  } catch (error) {
    CONFIG_LOGGER.error('applyBuyerProfileToSystem failed', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
    CONFIG_LOGGER.exitFunction('applyBuyerProfileToSystem', { success: false });
    return { success: false, reason: 'exception', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Sync buyer profile to dedicated sheets
 * @param {Object} profile - Buyer profile data
 * @returns {Object} Sync result
 */
function syncBuyerProfileToSheets(profile) {
  try {
    if (typeof SpreadsheetApp === 'undefined') {
      return { success: false, skipped: true };
    }

    const profileTabKey = getConfigValue('CUSTOMER.SHEETS.PROFILE_TAB_KEY');
    const rosterTabKey = getConfigValue('CUSTOMER.SHEETS.ROSTER_TAB_KEY');
    const profileSheetName = getConfigValue(`SHEETS.TAB_NAMES.${profileTabKey}`) || 'Buyer Profiles';
    const rosterSheetName = getConfigValue(`SHEETS.TAB_NAMES.${rosterTabKey}`) || 'Buyer Rosters';
    const profileColumns = getConfigValue(`SHEETS.REQUIRED_COLUMNS.${profileTabKey}`, []);
    const rosterColumns = getConfigValue(`SHEETS.REQUIRED_COLUMNS.${rosterTabKey}`, []);

    const profileSheet = SheetUtils.getOrCreateSheet(profileSheetName, profileColumns);
    const rosterSheet = SheetUtils.getOrCreateSheet(rosterSheetName, rosterColumns);
    const timestamp = new Date().toISOString();

    const profileRow = {
      'Buyer ID': profile.buyerId,
      'Club Name': profile.clubName || '',
      'Club Short Name': profile.clubShortName || profile.clubName || '',
      'League': profile.league || '',
      'Age Group': profile.ageGroup || '',
      'Primary Colour': profile.primaryColor || '',
      'Secondary Colour': profile.secondaryColor || '',
      'Badge URL': profile.badgeUrl || '',
      'Last Updated': timestamp
    };

    if (profileSheet) {
      const updated = SheetUtils.updateRowByCriteria(profileSheet, { 'Buyer ID': profile.buyerId }, profileRow);
      if (!updated) {
        SheetUtils.addRowFromObject(profileSheet, profileRow);
      }
    }

    if (rosterSheet) {
      const lastRow = rosterSheet.getLastRow();
      for (let rowIndex = lastRow; rowIndex >= 2; rowIndex -= 1) {
        const existingBuyerId = rosterSheet.getRange(rowIndex, 1).getValue();
        if (String(existingBuyerId).trim() === String(profile.buyerId).trim()) {
          rosterSheet.deleteRow(rowIndex);
        }
      }

      if (Array.isArray(profile.rosterEntries)) {
        profile.rosterEntries.forEach(entry => {
          const rosterRow = {
            'Buyer ID': profile.buyerId,
            'Player Name': entry.playerName || '',
            'Position': entry.position || '',
            'Squad Number': entry.squadNumber || '',
            'Last Updated': timestamp
          };
          SheetUtils.addRowFromObject(rosterSheet, rosterRow);
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to sync buyer profile to sheets:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Persist buyer profile to script properties and sync
 * @param {Object} profile - Buyer profile data
 * @returns {Object} Save result
 */
function saveBuyerProfile(profile) {
  try {
    if (!profile || typeof profile !== 'object') {
      throw new Error('Invalid buyer profile payload');
    }

    const resolvedProfile = Object.assign({}, getConfigValue('CUSTOMER.DEFAULT_PROFILE'), profile);
    resolvedProfile.buyerId = resolvedProfile.buyerId || ensureBuyerProfileId();
    resolvedProfile.updatedAt = new Date().toISOString();

    const propertyKeys = getConfigValue('CUSTOMER.PROPERTY_KEYS');

    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      const scriptProperties = PropertiesService.getScriptProperties();
      const profileToPersist = JSON.parse(JSON.stringify(resolvedProfile));
      delete profileToPersist.badgeBase64;

      // @testHook(buyer_profile_properties_write_start)
      scriptProperties.setProperty(propertyKeys.PROFILE, JSON.stringify(profileToPersist));
      // @testHook(buyer_profile_properties_write_complete)

      if (resolvedProfile.badgeBase64) {
        // @testHook(buyer_badge_properties_write_start)
        scriptProperties.setProperty(propertyKeys.BADGE_BASE64, resolvedProfile.badgeBase64);
        // @testHook(buyer_badge_properties_write_complete)
      } else {
        // @testHook(buyer_badge_properties_delete_start)
        scriptProperties.deleteProperty(propertyKeys.BADGE_BASE64);
        // @testHook(buyer_badge_properties_delete_complete)
      }
    }

    const appliedResult = applyBuyerProfileToSystem(resolvedProfile);
    const syncResult = syncBuyerProfileToSheets(resolvedProfile);

    return {
      success: appliedResult.success === true,
      profile: resolvedProfile,
      applied: appliedResult,
      synced: syncResult
    };
  } catch (error) {
    console.error('Failed to save buyer profile:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Load buyer overrides and apply to runtime config
 * @returns {Object} Override result
 */
function loadBuyerProfileOverrides() {
  try {
    const profile = getBuyerProfile(false);
    if (!profile) {
      return { success: true, applied: false };
    }

    profile.buyerId = profile.buyerId || ensureBuyerProfileId();
    const applied = applyBuyerProfileToSystem(profile);

    return {
      success: applied.success === true,
      applied: applied.success === true,
      profile: applied.profile
    };
  } catch (error) {
    console.error('Failed to load buyer profile overrides:', error);
    return { success: false, error: error.toString() };
  }
}
/**
 * Initialize configuration system
 * @returns {Object} Initialization result
 */
function initializeConfig() {
  try {
    const overrides = loadBuyerProfileOverrides();

    // Validate configuration
    const validation = validateConfiguration();

    if (!validation.valid) {
      console.warn('Configuration validation failed:', validation.issues);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }
    
    return {
      success: true,
      version: getConfigValue('SYSTEM.VERSION'),
      validation: validation,
      bible_compliant: getConfigValue('SYSTEM.BIBLE_COMPLIANT'),
      buyer_profile: overrides,
      features_enabled: Object.entries(getConfigValue('FEATURES', {}))
        .filter(([key, value]) => value === true)
        .map(([key]) => key)
    };

  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== EXPORT FOR TESTING ====================

/**
 * Export configuration for testing purposes
 * @returns {Object} Configuration object
 */
function exportConfig() {
  return SYSTEM_CONFIG;
}

/**
 * Get runtime configuration for UI and health checks
 * Enterprise-grade security with authentication, rate limiting, and audit trail
 * @param {string} requestSource - Source of the request for audit purposes
 * @returns {Object} Sanitized runtime configuration
 */
function getRuntimeConfig(requestSource = 'unknown') {
  const startTime = Date.now();

  try {
    // Security Layer 1: Authentication check
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail || !userEmail.includes('@')) {
      console.error('getRuntimeConfig: Authentication failed - no valid user session');
      throw new Error('Authentication required for configuration access');
    }

    // Security Layer 2: Rate limiting (5 requests per minute per user)
    const rateLimitKey = `config_access_${userEmail}`;
    const rateLimit = this.checkConfigRateLimit(rateLimitKey, 5, 60000);
    if (!rateLimit.allowed) {
      console.warn(`getRuntimeConfig: Rate limit exceeded for ${userEmail}: ${rateLimit.current}/${rateLimit.limit}`);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds`);
    }

    // Security Layer 3: Audit logging
    this.logConfigAccess(userEmail, requestSource, 'success');

    const properties = PropertiesService.getScriptProperties().getProperties();

    // Build sanitized runtime config (NO SECRETS)
    const runtimeConfig = {
      // System information (safe to expose)
      version: properties['SYSTEM.VERSION'] || getConfigValue('SYSTEM.VERSION'),
      environment: properties['SYSTEM.ENVIRONMENT'] || getConfigValue('SYSTEM.ENVIRONMENT'),
      club_name: properties['SYSTEM.CLUB_NAME'] || getConfigValue('SYSTEM.CLUB_NAME'),
      club_short_name: properties['SYSTEM.CLUB_SHORT_NAME'] || getConfigValue('SYSTEM.CLUB_SHORT_NAME'),
      league: properties['SYSTEM.LEAGUE_NAME'] || getConfigValue('SYSTEM.LEAGUE'),
      season: properties['SYSTEM.SEASON'] || getConfigValue('SYSTEM.SEASON'),

      // Installation info (anonymized)
      installed: !!properties['INSTALL.COMPLETED_AT'],
      installed_at: properties['INSTALL.COMPLETED_AT'],
      // REMOVED: installed_by (privacy leak prevention)

      // Feature flags (boolean values only - no secrets)
      features: {
        live_match_processing: getConfigValue('FEATURES.LIVE_MATCH_PROCESSING'),
        batch_posting: getConfigValue('FEATURES.BATCH_POSTING'),
        player_statistics: getConfigValue('FEATURES.PLAYER_STATISTICS'),
        make_integration: !!properties['MAKE.WEBHOOK_URL'], // Boolean only
        video_integration: getConfigValue('FEATURES.VIDEO_INTEGRATION'),
        weekly_schedule: getConfigValue('FEATURES.WEEKLY_CONTENT_AUTOMATION'),
        monthly_summaries: getConfigValue('FEATURES.MONTHLY_SUMMARIES')
      },

      // System status (boolean values only)
      sheet_configured: !!(properties['SYSTEM.SPREADSHEET_ID'] || properties['SPREADSHEET_ID']),
      webhook_configured: !!properties['MAKE.WEBHOOK_URL'],

      // Metadata
      last_updated: new Date().toISOString(),
      response_time_ms: Date.now() - startTime,
      accessed_by: hashEmail(userEmail), // Privacy-safe identifier
      request_source: requestSource
    };

    // Clean null/undefined values
    Object.keys(runtimeConfig).forEach(key => {
      if (runtimeConfig[key] === null || runtimeConfig[key] === undefined) {
        delete runtimeConfig[key];
      }
    });

    console.log(`getRuntimeConfig: Success for ${userEmail} from ${requestSource} (${Date.now() - startTime}ms)`);
    return runtimeConfig;

  } catch (error) {
    // Security audit: Log all failures
    const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
    this.logConfigAccess(userEmail, requestSource, 'failed', error.toString());

    console.error('getRuntimeConfig failed:', error);

    // Return minimal error response (no details leaked)
    return {
      success: false,
      error: 'Configuration access denied',
      version: getConfigValue('SYSTEM.VERSION', '6.2.0'),
      timestamp: new Date().toISOString(),
      request_id: Utilities.getUuid().substring(0, 8)
    };
  }
}

/**
 * Rate limiting specifically for configuration access
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Rate limit status
 */
function checkConfigRateLimit(key, maxRequests, windowMs) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const now = Date.now();
    const windowStart = now - windowMs;

    const storedData = properties.getProperty(key);
    let requests = [];

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed)) {
          requests = parsed.filter(time => typeof time === 'number' && time > windowStart);
        }
      } catch (parseError) {
        console.warn(`Rate limit data corruption for ${key}:`, parseError);
        properties.deleteProperty(key);
      }
    }

    if (requests.length >= maxRequests) {
      return {
        allowed: false,
        current: requests.length,
        limit: maxRequests,
        resetTime: requests[0] + windowMs
      };
    }

    // Add current request
    requests.push(now);
    properties.setProperty(key, JSON.stringify(requests));

    return {
      allowed: true,
      current: requests.length,
      limit: maxRequests,
      resetTime: now + windowMs
    };

  } catch (error) {
    console.error('Config rate limiting error:', error);
    // Fail open for availability
    return { allowed: true, error: error.toString() };
  }
}

/**
 * Audit log for configuration access
 * @param {string} userEmail - User email
 * @param {string} source - Request source
 * @param {string} status - Access status
 * @param {string} details - Additional details
 */
function logConfigAccess(userEmail, source, status, details = null) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_hash: hashEmail(userEmail),
      source: source,
      status: status,
      details: details,
      ip: 'apps_script_limitation'
    };

    // Store in rotating log (keep last 100 entries)
    const logKey = 'config_access_log';
    const existingLog = properties.getProperty(logKey);
    let logs = existingLog ? JSON.parse(existingLog) : [];

    logs.push(logEntry);
    if (logs.length > 100) {
      logs = logs.slice(-100); // Keep only last 100 entries
    }

    properties.setProperty(logKey, JSON.stringify(logs));

    // Also log to console for immediate monitoring
    console.log(`[CONFIG_ACCESS] ${status.toUpperCase()}: ${hashEmail(userEmail)} from ${source}`);

  } catch (error) {
    console.error('Config access logging failed:', error);
    // Don't throw - logging failure shouldn't break main functionality
  }
}

/**
 * Hash email for privacy-compliant logging
 * @param {string} email - Email to hash
 * @returns {string} SHA-256 hash of email (first 8 chars)
 */
function hashEmail(email) {
  if (!email) return 'anonymous';
  try {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
    return Utilities.base64Encode(digest).substring(0, 8);
  } catch (error) {
    return 'hash_error';
  }
}

/**
 * Reset configuration to defaults (testing only)
 * @returns {boolean} Success status
 */
function resetConfig() {
  try {
    // This would reset to defaults in a test environment
    // Not implemented for production safety
    console.warn('Config reset not implemented for production safety');
    return false;
  } catch (error) {
    console.error('Failed to reset configuration:', error);
    return false;
  }
}

// End of configuration
