/**
 * @fileoverview XbotGo Scoreboard API Integration
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Integration with XbotGo scoreboard system for live score updates
 */

/**
 * XbotGo Integration Class
 * Handles all communications with XbotGo scoreboard API
 */
class XbotGoIntegration {
  
  constructor() {
    this.loggerName = 'XbotGo';
    this._logger = null;
    this.apiBaseUrl = getSecureProperty(getConfigValue('XBOTGO.API_BASE_URL_PROPERTY', ''));
    this.apiKey = getSecureProperty(getConfigValue('XBOTGO.API_KEY_PROPERTY', ''));
    this.deviceId = getSecureProperty(getConfigValue('XBOTGO.DEVICE_ID_PROPERTY', ''));
    this.enabled = getConfigValue('XBOTGO.ENABLED', false);
    this.maxRetries = getConfigValue('XBOTGO.MAX_RETRIES', 3);
    this.retryDelay = getConfigValue('XBOTGO.RETRY_DELAY_MS', 1000);
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

  /**
   * Push score to XbotGo scoreboard
   * @param {string} matchId - Match ID
   * @param {number} homeScore - Home team score
   * @param {number} awayScore - Away team score
   * @param {Object} matchInfo - Additional match information
   * @returns {Object} Push result
   */
  pushScoreToXbotGo(matchId, homeScore, awayScore, matchInfo = {}) {
    this.logger.enterFunction('pushScoreToXbotGo', { matchId, homeScore, awayScore });
    
    try {
      // @testHook(xbotgo_score_push_start)
      
      if (!this.enabled) {
        return {
          success: true,
          message: 'XbotGo integration is disabled',
          skipped: true
        };
      }
      
      if (!this.apiBaseUrl || !this.apiKey || !this.deviceId) {
        throw new Error('XbotGo configuration is incomplete');
      }
      
      // Prepare score data
      const scoreData = {
        device_id: this.deviceId,
        match_id: matchId,
        home_score: parseInt(homeScore) || 0,
        away_score: parseInt(awayScore) || 0,
        timestamp: DateUtils.formatISO(DateUtils.now()),
        club_name: getConfigValue('SYSTEM.CLUB_NAME'),
        opponent: matchInfo.opponent || 'Unknown',
        minute: matchInfo.minute || '0',
        status: matchInfo.status || 'live'
      };
      
      // Send to XbotGo API with retry logic
      const result = this.sendToXbotGoAPI('score/update', scoreData);
      
      // @testHook(xbotgo_score_push_complete)
      
      this.logger.exitFunction('pushScoreToXbotGo', { 
        success: result.success,
        home_score: homeScore,
        away_score: awayScore
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('XbotGo score push failed', { 
        error: error.toString(),
        matchId, homeScore, awayScore 
      });
      
      return {
        success: false,
        error: error.toString(),
        match_id: matchId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Push match status to XbotGo
   * @param {string} matchId - Match ID
   * @param {string} status - Match status (kickoff, halftime, fulltime)
   * @param {Object} matchInfo - Match information
   * @returns {Object} Push result
   */
  pushMatchStatus(matchId, status, matchInfo = {}) {
    this.logger.enterFunction('pushMatchStatus', { matchId, status });
    
    try {
      // @testHook(xbotgo_status_push_start)
      
      if (!this.enabled) {
        return {
          success: true,
          message: 'XbotGo integration is disabled',
          skipped: true
        };
      }
      
      const statusData = {
        device_id: this.deviceId,
        match_id: matchId,
        status: status,
        timestamp: DateUtils.formatISO(DateUtils.now()),
        minute: matchInfo.minute || '0',
        home_score: matchInfo.homeScore || 0,
        away_score: matchInfo.awayScore || 0
      };
      
      const result = this.sendToXbotGoAPI('match/status', statusData);
      
      // @testHook(xbotgo_status_push_complete)
      
      this.logger.exitFunction('pushMatchStatus', { 
        success: result.success,
        status: status
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('XbotGo status push failed', { 
        error: error.toString(),
        matchId, status 
      });
      
      return {
        success: false,
        error: error.toString(),
        match_id: matchId,
        status: status,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Initialize XbotGo for match
   * @param {string} matchId - Match ID
   * @param {Object} matchDetails - Match details
   * @returns {Object} Initialization result
   */
  initializeMatch(matchId, matchDetails = {}) {
    this.logger.enterFunction('initializeMatch', { matchId });
    
    try {
      // @testHook(xbotgo_match_init_start)
      
      if (!this.enabled) {
        return {
          success: true,
          message: 'XbotGo integration is disabled',
          skipped: true
        };
      }
      
      const initData = {
        device_id: this.deviceId,
        match_id: matchId,
        home_team: getConfigValue('SYSTEM.CLUB_NAME'),
        away_team: matchDetails.opponent || 'Unknown',
        competition: matchDetails.competition || 'League',
        venue: matchDetails.venue || 'Home',
        date: matchDetails.date || DateUtils.formatUK(DateUtils.now()),
        time: matchDetails.time || DateUtils.formatTime(DateUtils.now()),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
      const result = this.sendToXbotGoAPI('match/initialize', initData);
      
      // @testHook(xbotgo_match_init_complete)
      
      this.logger.exitFunction('initializeMatch', { success: result.success });
      
      return result;
      
    } catch (error) {
      this.logger.error('XbotGo match initialization failed', { 
        error: error.toString(),
        matchId 
      });
      
      return {
        success: false,
        error: error.toString(),
        match_id: matchId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Send data to XbotGo API with retry logic
   * @private
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Data to send
   * @returns {Object} API response
   */
  sendToXbotGoAPI(endpoint, data) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // @testHook(xbotgo_api_attempt_start)
        
        const url = `${this.apiBaseUrl}/${endpoint}`;
        
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Device-ID': this.deviceId,
            'User-Agent': `${getConfigValue('SYSTEM.NAME')} v${getConfigValue('SYSTEM.VERSION')}`
          },
          payload: JSON.stringify(data)
        };
        
        if (attempt > 0) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          Utilities.sleep(delay);
        }
        
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        // @testHook(xbotgo_api_attempt_complete)
        
        if (responseCode >= 200 && responseCode < 300) {
          this.logger.info('XbotGo API call successful', {
            endpoint: endpoint,
            response_code: responseCode,
            attempts: attempt + 1
          });
          
          let responseData = {};
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            responseData = { raw_response: responseText };
          }
          
          return {
            success: true,
            response_code: responseCode,
            response: responseData,
            attempts: attempt + 1,
            endpoint: endpoint,
            timestamp: DateUtils.formatISO(DateUtils.now())
          };
        } else {
          lastError = `HTTP ${responseCode}: ${responseText}`;
          this.logger.warn(`XbotGo API attempt ${attempt + 1} failed`, {
            endpoint: endpoint,
            response_code: responseCode,
            response: responseText.substring(0, 200)
          });
        }
        
      } catch (error) {
        lastError = error.toString();
        this.logger.warn(`XbotGo API attempt ${attempt + 1} error`, {
          endpoint: endpoint,
          error: error.toString()
        });
      }
    }
    
    return {
      success: false,
      error: lastError || 'Unknown error',
      attempts: this.maxRetries + 1,
      endpoint: endpoint,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Test XbotGo connection
   * @returns {Object} Test result
   */
  testConnection() {
    this.logger.enterFunction('testConnection');
    
    try {
      if (!this.enabled) {
        return {
          success: true,
          message: 'XbotGo integration is disabled',
          configuration_complete: false,
          skipped: true
        };
      }
      
      if (!this.apiBaseUrl || !this.apiKey || !this.deviceId) {
        return {
          success: false,
          error: 'XbotGo configuration is incomplete',
          configuration: {
            api_url: !!this.apiBaseUrl,
            api_key: !!this.apiKey,
            device_id: !!this.deviceId
          }
        };
      }
      
      // Test with ping endpoint
      const testData = {
        device_id: this.deviceId,
        timestamp: DateUtils.formatISO(DateUtils.now()),
        test: true
      };
      
      const result = this.sendToXbotGoAPI('ping', testData);
      
      this.logger.exitFunction('testConnection', { success: result.success });
      
      return {
        success: result.success,
        configuration_complete: true,
        api_response: result,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('XbotGo connection test failed', { error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        configuration_complete: false
      };
    }
  }

  /**
   * Get XbotGo device status
   * @returns {Object} Device status
   */
  getDeviceStatus() {
    this.logger.enterFunction('getDeviceStatus');
    
    try {
      if (!this.enabled) {
        return {
          success: true,
          message: 'XbotGo integration is disabled',
          device_online: false,
          skipped: true
        };
      }
      
      const result = this.sendToXbotGoAPI('device/status', {
        device_id: this.deviceId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      });
      
      this.logger.exitFunction('getDeviceStatus', { success: result.success });
      
      return {
        success: result.success,
        device_online: result.success,
        device_id: this.deviceId,
        last_check: DateUtils.formatISO(DateUtils.now()),
        api_response: result
      };
      
    } catch (error) {
      this.logger.error('XbotGo device status check failed', { error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        device_online: false
      };
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize XbotGo Integration
 * @returns {Object} Initialization result
 */
function initializeXbotGo() {
  logger.enterFunction('XbotGo.initialize');
  
  try {
    const integration = new XbotGoIntegration();
    
    const configurationStatus = {
      enabled: integration.enabled,
      api_url_configured: !!integration.apiBaseUrl,
      api_key_configured: !!integration.apiKey,
      device_id_configured: !!integration.deviceId
    };
    
    const configurationComplete = Object.values(configurationStatus)
      .slice(1) // Skip enabled flag
      .every(status => status === true);
    
    logger.exitFunction('XbotGo.initialize', { 
      success: true,
      configuration_complete: configurationComplete
    });
    
    return {
      success: true,
      configuration: configurationStatus,
      configuration_complete: configurationComplete,
      integration_enabled: integration.enabled,
      message: 'XbotGo Integration initialized',
      version: '6.2.0'
    };
    
  } catch (error) {
    logger.error('XbotGo initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Push score to XbotGo (public API)
 * @param {string} matchId - Match ID
 * @param {number} homeScore - Home score
 * @param {number} awayScore - Away score
 * @param {Object} matchInfo - Match information
 * @returns {Object} Push result
 */
function pushScoreToXbotGo(matchId, homeScore, awayScore, matchInfo = {}) {
  const integration = new XbotGoIntegration();
  return integration.pushScoreToXbotGo(matchId, homeScore, awayScore, matchInfo);
}

/**
 * Push match status to XbotGo (public API)
 * @param {string} matchId - Match ID
 * @param {string} status - Match status
 * @param {Object} matchInfo - Match information
 * @returns {Object} Push result
 */
function pushMatchStatusToXbotGo(matchId, status, matchInfo = {}) {
  const integration = new XbotGoIntegration();
  return integration.pushMatchStatus(matchId, status, matchInfo);
}

/**
 * Initialize XbotGo match (public API)
 * @param {string} matchId - Match ID
 * @param {Object} matchDetails - Match details
 * @returns {Object} Initialization result
 */
function initializeXbotGoMatch(matchId, matchDetails = {}) {
  const integration = new XbotGoIntegration();
  return integration.initializeMatch(matchId, matchDetails);
}

/**
 * Test XbotGo connection (public API)
 * @returns {Object} Test result
 */
function testXbotGoConnection() {
  const integration = new XbotGoIntegration();
  return integration.testConnection();
}

/**
 * Get XbotGo device status (public API)
 * @returns {Object} Device status
 */
function getXbotGoDeviceStatus() {
  const integration = new XbotGoIntegration();
  return integration.getDeviceStatus();
}

/**
 * Enable/disable XbotGo integration (public API)
 * @param {boolean} enabled - Enable status
 * @returns {Object} Configuration result
 */
function setXbotGoEnabled(enabled) {
  try {
    setConfig('XBOTGO.ENABLED', enabled);
    
    logger.info('XbotGo integration status changed', { enabled });
    
    return {
      success: true,
      enabled: enabled,
      message: `XbotGo integration ${enabled ? 'enabled' : 'disabled'}`,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Failed to set XbotGo enabled status', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test XbotGo integration functionality
 * @returns {Object} Test results
 */
function testXbotGoIntegration() {
  logger.enterFunction('XbotGo.test');
  
  try {
    const integration = new XbotGoIntegration();
    const results = {
      initialization: false,
      configuration: false,
      connection_test: false,
      score_push_simulation: false
    };
    
    // Test initialization
    const initResult = initializeXbotGo();
    results.initialization = initResult.success;
    
    // Test configuration
    results.configuration = initResult.configuration_complete;
    
    // Test connection (only if enabled and configured)
    if (integration.enabled && initResult.configuration_complete) {
      try {
        const connectionResult = integration.testConnection();
        results.connection_test = connectionResult.success;
      } catch (error) {
        logger.warn('XbotGo connection test failed', { error: error.toString() });
      }
    } else {
      results.connection_test = true; // Skip if disabled/not configured
    }
    
    // Test score push simulation
    try {
      const scoreResult = integration.pushScoreToXbotGo('test_match', 1, 0, {
        opponent: 'Test FC',
        minute: '45'
      });
      results.score_push_simulation = scoreResult.success !== false; // Allow skipped
    } catch (error) {
      logger.warn('Score push simulation failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('XbotGo.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      integration_enabled: integration.enabled,
      configuration_complete: initResult.configuration_complete,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('XbotGo integration test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

