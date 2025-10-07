/**
 * @fileoverview Practical Test Suite for Football Automation System
 * @version 6.2.0
 * @description 6 focused, runnable tests for core functionality
 */

/**
 * Simple Test Framework
 */
class SimpleTestFramework {
  static getResults() {
    if (!this._results) this._results = [];
    return this._results;
  }

  static assertEquals(actual, expected, message) {
    if (actual === expected) {
      return { passed: true, message: message };
    } else {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  static assertNotNull(value, message) {
    if (value !== null && value !== undefined) {
      return { passed: true, message: message };
    } else {
      throw new Error(`${message}: value was null or undefined`);
    }
  }

  static assertTrue(condition, message) {
    if (condition === true) {
      return { passed: true, message: message };
    } else {
      throw new Error(`${message}: condition was false`);
    }
  }

  static runTest(testName, testFunction) {
    const startTime = Date.now();

    try {
      testFunction();
      const duration = Date.now() - startTime;

      this.getResults().push({
        name: testName,
        status: 'PASS',
        duration: duration,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;

      this.getResults().push({
        name: testName,
        status: 'FAIL',
        duration: duration,
        error: error.toString(),
        timestamp: new Date().toISOString()
      });

      console.error(`❌ ${testName} - FAILED (${duration}ms): ${error.toString()}`);
    }
  }

  static getResults() {
    const passed = this.getResults().filter(r => r.status === 'PASS').length;
    const failed = this.getResults().filter(r => r.status === 'FAIL').length;

    return {
      summary: {
        total: this.getResults().length,
        passed: passed,
        failed: failed,
        passRate: this.getResults().length > 0 ? (passed / this.getResults().length * 100).toFixed(1) : 0
      },
      results: this.getResults()
    };
  }

  static reset() {
    this.getResults() = [];
  }
}

/**
 * Test 1: Config Loading and Required Keys
 */
function testConfigLoading() {
  SimpleTestFramework.runTest('Config Loading', () => {
    // Test dynamic config can be loaded from sheet cache
    const dynamicConfig = getDynamicConfig();
    SimpleTestFramework.assertNotNull(dynamicConfig, 'Dynamic config should load successfully');

    const dynamicRequiredKeys = ['TEAM_NAME', 'TEAM_SHORT', 'LEAGUE_NAME'];
    dynamicRequiredKeys.forEach(key => {
      SimpleTestFramework.assertTrue(!!dynamicConfig[key], `Dynamic config should include ${key}`);
    });

    // Test static config helper for nested values
    const systemVersion = getConfigValue('SYSTEM.VERSION', null);
    SimpleTestFramework.assertNotNull(systemVersion, 'System version should be available from static config');

    const clubName = getConfigValue('SYSTEM.CLUB_NAME', null);
    SimpleTestFramework.assertNotNull(clubName, 'Club name should be available from static config');

    const featureFlags = getConfigValue('FEATURES', {});
    SimpleTestFramework.assertTrue(typeof featureFlags === 'object', 'Feature flags should resolve to an object');
  });
}

/**
 * Test 2: Input Validation Functions
 */
function testInputValidation() {
  SimpleTestFramework.runTest('Input Validation', () => {
    // Test player name sanitization
    const sanitized = InputValidator.sanitizePlayerName('John <script>alert("xss")</script> Doe');
    SimpleTestFramework.assertEquals(sanitized, 'John Doe', 'Should remove script tags');

    // Test minute validation
    const validMinute = InputValidator.validateMinute('45');
    SimpleTestFramework.assertEquals(validMinute, 45, 'Should validate correct minute');

    // Test invalid minute throws error
    try {
      InputValidator.validateMinute('150');
      throw new Error('Should have thrown error for invalid minute');
    } catch (error) {
      SimpleTestFramework.assertTrue(error.message.includes('Invalid minute'), 'Should throw minute validation error');
    }

    // Test score validation
    const validScore = InputValidator.validateScore('2');
    SimpleTestFramework.assertEquals(validScore, 2, 'Should validate correct score');
  });
}

/**
 * Test 3: Health Check System
 */
function testHealthCheck() {
  SimpleTestFramework.runTest('Health Check', () => {
    // Test health check runs
    const health = HealthCheck.performHealthCheck();
    SimpleTestFramework.assertNotNull(health, 'Health check should return result');
    SimpleTestFramework.assertNotNull(health.status, 'Health check should have status');
    SimpleTestFramework.assertNotNull(health.timestamp, 'Health check should have timestamp');

    // Test status is valid
    const validStatuses = ['healthy', 'warning', 'error'];
    SimpleTestFramework.assertTrue(validStatuses.includes(health.status), 'Health status should be valid');

    // Test checks object exists
    SimpleTestFramework.assertNotNull(health.checks, 'Health check should have checks object');

    // Test quick health check
    const quickHealth = HealthCheck.quickHealthCheck();
    SimpleTestFramework.assertNotNull(quickHealth.status, 'Quick health check should have status');
  });
}

/**
 * Test 4: Match Event Data Validation
 */
function testMatchEventValidation() {
  SimpleTestFramework.runTest('Match Event Validation', () => {
    // Test valid event data
    const validEvent = {
      eventType: 'goal',
      player: 'John Doe',
      minute: 45,
      additionalData: { assist: 'Jane Smith' }
    };

    const validation = validateMatchEventData(validEvent);
    SimpleTestFramework.assertTrue(validation.valid, 'Valid event should pass validation');
    SimpleTestFramework.assertEquals(validation.data.eventType, 'goal', 'Event type should be preserved');
    SimpleTestFramework.assertEquals(validation.data.player, 'John Doe', 'Player name should be preserved');

    // Test invalid event type
    const invalidEvent = {
      eventType: 'invalid_type',
      player: 'John Doe',
      minute: 45
    };

    const invalidValidation = validateMatchEventData(invalidEvent);
    SimpleTestFramework.assertTrue(!invalidValidation.valid, 'Invalid event type should fail validation');
  });
}

/**
 * Test 5: Security Permission Check
 */
function testSecurityPermissions() {
  SimpleTestFramework.runTest('Security Permissions', () => {
    // Test permission check function exists and runs
    const permission = InputValidator.checkPermission('test_action');
    SimpleTestFramework.assertNotNull(permission, 'Permission check should return result');
    SimpleTestFramework.assertNotNull(permission.allowed, 'Permission check should have allowed property');

    // Test CSRF token generation
    const token = InputValidator.generateCSRFToken();
    SimpleTestFramework.assertNotNull(token, 'CSRF token should be generated');
    SimpleTestFramework.assertTrue(token.includes('-'), 'CSRF token should have expected format');

    // Test CSRF token validation
    const isValid = InputValidator.validateCSRFToken(token);
    SimpleTestFramework.assertTrue(isValid, 'Newly generated CSRF token should be valid');

    // Test invalid token
    const invalidToken = InputValidator.validateCSRFToken('invalid-token');
    SimpleTestFramework.assertTrue(!invalidToken, 'Invalid CSRF token should be rejected');
  });
}

/**
 * Test 6: Rate Limiting System
 */
function testRateLimiting() {
  SimpleTestFramework.runTest('Rate Limiting', () => {
    const identifier = 'test_user_' + Date.now();

    // Test first request is allowed
    const firstCheck = RateLimiter.checkLimit(identifier, 3, 60000);
    SimpleTestFramework.assertTrue(firstCheck.allowed, 'First request should be allowed');
    SimpleTestFramework.assertEquals(firstCheck.remaining, 2, 'Should have 2 remaining requests');

    // Test second request
    const secondCheck = RateLimiter.checkLimit(identifier, 3, 60000);
    SimpleTestFramework.assertTrue(secondCheck.allowed, 'Second request should be allowed');
    SimpleTestFramework.assertEquals(secondCheck.remaining, 1, 'Should have 1 remaining request');

    // Test third request
    const thirdCheck = RateLimiter.checkLimit(identifier, 3, 60000);
    SimpleTestFramework.assertTrue(thirdCheck.allowed, 'Third request should be allowed');
    SimpleTestFramework.assertEquals(thirdCheck.remaining, 0, 'Should have 0 remaining requests');

    // Test fourth request should be denied
    const fourthCheck = RateLimiter.checkLimit(identifier, 3, 60000);
    SimpleTestFramework.assertTrue(!fourthCheck.allowed, 'Fourth request should be denied');
  });
}

/**
 * Run all tests and return results
 */
function runAllPracticalTests() {
  console.log('🧪 Starting Practical Test Suite...');

  // Reset test results
  SimpleTestFramework.reset();

  // Run all 6 tests
  testConfigLoading();
  testInputValidation();
  testHealthCheck();
  testMatchEventValidation();
  testSecurityPermissions();
  testRateLimiting();

  // Get results
  const results = SimpleTestFramework.getResults();

  console.log(`\n📊 Test Results Summary:`);
  console.log(`Total: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Pass Rate: ${results.summary.passRate}%`);

  if (results.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.results.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }

  return results;
}

/**
 * Run individual test by name
 */
function runSingleTest(testName) {
  SimpleTestFramework.reset();

  switch (testName) {
    case 'config':
      testConfigLoading();
      break;
    case 'validation':
      testInputValidation();
      break;
    case 'health':
      testHealthCheck();
      break;
    case 'events':
      testMatchEventValidation();
      break;
    case 'security':
      testSecurityPermissions();
      break;
    case 'ratelimit':
      testRateLimiting();
      break;
    default:
      throw new Error(`Unknown test: ${testName}`);
  }

  return SimpleTestFramework.getResults();
}

/**
 * Quick smoke test for basic functionality
 */
function smokeTest() {
  try {
    // Test 1: Config loads
    const config = getDynamicConfig();
    if (!config) throw new Error('Config failed to load');

    // Test 2: Health check runs
    const health = HealthCheck.quickHealthCheck();
    if (!health.status) throw new Error('Health check failed');

    // Test 3: Input validation works
    const sanitized = InputValidator.sanitizePlayerName('Test Player');
    if (!sanitized) throw new Error('Input validation failed');

    console.log('✅ Smoke test passed - basic functionality working');
    return { success: true, message: 'All basic functions operational' };

  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    return { success: false, error: error.toString() };
  }
}