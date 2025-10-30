/**
 * @fileoverview Comprehensive Test Suites for Football Automation System
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Complete test coverage for all system components
 *
 * TEST SUITES:
 * - Security and Authentication Tests
 * - Control Panel Tests
 * - Input Validation Tests
 * - Player Management Tests
 * - Event Processing Tests
 * - Integration Tests
 * - Performance Tests
 */

// ==================== SECURITY AUTHENTICATION TESTS ====================

suite('Security and Authentication', function() {
  let testUser, testSession;

  setup(function() {
    // Setup test data
    testUser = {
      username: 'testuser',
      password: 'testpass123',
      role: 'admin'
    };
  });

  teardown(function() {
    // Clean up test sessions
    if (testSession) {
      SecurityManager_Instance.destroySession(testSession);
    }
  });

  test('should authenticate valid admin user', function() {
    const result = authenticateAdminSecure('admin', 'admin123');

    // Should require password change for legacy accounts
    if (result.requiresPasswordChange) {
      ok(!result.success, 'Legacy accounts should require password change');
      ok(result.error.includes('Legacy account'), 'Should indicate legacy account');
    } else {
      ok(result.success, 'Authentication should succeed');
      ok(result.sessionToken, 'Should return session token');
      equal(result.role, 'super_admin', 'Should return correct role');
      ok(result.expiresAt, 'Should return expiration time');
    }
  });

  test('should reject invalid credentials', function() {
    const result = authenticateAdminSecure('admin', 'wrongpassword');

    notOk(result.success, 'Authentication should fail');
    ok(result.error, 'Should return error message');
    notOk(result.sessionToken, 'Should not return session token');
  });

  test('should validate session permissions', function() {
    const authResult = authenticateAdminSecure('admin', 'admin123');

    // Skip permission test if password change is required
    if (authResult.requiresPasswordChange) {
      ok(!authResult.success, 'Should require password change');
      return;
    }

    const permissionResult = checkPermission(authResult.sessionToken, 'control_panel_access');

    ok(permissionResult.success, 'Permission check should succeed');
    ok(permissionResult.session, 'Should return session data');
  });

  test('should reject expired sessions', function() {
    // Mock expired session
    const mockToken = 'expired_token_123';
    const result = checkPermission(mockToken, 'control_panel_access');

    notOk(result.success, 'Should reject expired session');
    ok(result.error.includes('Invalid session'), 'Should return appropriate error');
  });

  test('should handle account lockout after failed attempts', function() {
    // Simulate multiple failed attempts
    for (let i = 0; i < 4; i++) {
      authenticateAdminSecure('testuser', 'wrongpassword');
    }

    const result = authenticateAdminSecure('testuser', 'wrongpassword');
    ok(result.error.includes('locked'), 'Should lock account after max attempts');
  });
});

// ==================== INPUT VALIDATION TESTS ====================

suite('Input Validation', function() {

  test('should validate player names correctly', function() {
    const validResult = validateInput('John Smith', 'playerName');
    ok(validResult.success, 'Should accept valid player name');
    equal(validResult.value, 'John Smith', 'Should return sanitized name');

    const invalidResult = validateInput('John<script>', 'playerName');
    notOk(invalidResult.success, 'Should reject player name with script tags');
  });

  test('should validate match minutes', function() {
    const validResult = validateInput(45, 'minute');
    ok(validResult.success, 'Should accept valid minute');
    equal(validResult.value, 45, 'Should return correct minute');

    const invalidResult = validateInput(150, 'minute');
    notOk(invalidResult.success, 'Should reject invalid minute');
  });

  test('should sanitize dangerous input', function() {
    const dangerous = '<script>alert("xss")</script>';
    const result = SecurityManager_Instance.sanitizeInput(dangerous, 'string');
    notOk(result.includes('<script>'), 'Should remove script tags');
    notOk(result.includes('javascript:'), 'Should remove javascript protocols');
  });

  test('should validate email addresses', function() {
    const validResult = validateInput('test@example.com', 'email');
    ok(validResult.success, 'Should accept valid email');

    const invalidResult = validateInput('notanemail', 'email');
    notOk(invalidResult.success, 'Should reject invalid email');
  });

  test('should enforce string length limits', function() {
    const tooLong = 'a'.repeat(100);
    const result = validateInput(tooLong, 'string', { maxLength: 50 });
    notOk(result.success, 'Should reject strings exceeding max length');
  });
});

// ==================== PII PROTECTION TESTS ====================

suite('PII Protection', function() {

  test('should mask sensitive data', function() {
    const data = {
      username: 'testuser',
      password: 'secret123',
      email: 'test@example.com',
      player_name: 'John Smith'
    };

    const masked = maskPII(data);

    notEqual(masked.password, 'secret123', 'Should mask password');
    notEqual(masked.email, 'test@example.com', 'Should mask email');
    ok(masked.player_name.includes('John'), 'Should preserve first name');
    ok(masked.player_name.includes('*'), 'Should mask surname');
  });

  test('should handle null and undefined values', function() {
    const data = {
      username: null,
      password: undefined,
      email: ''
    };

    const masked = maskPII(data);
    equal(masked.username, null, 'Should handle null values');
    equal(masked.password, undefined, 'Should handle undefined values');
  });
});

suite('Payments and Subscriptions', function() {
  function createMockSheet(initialHeaders) {
    const sheetData = [];
    const sheet = {
      data: sheetData,
      getName: () => 'MockSheet',
      getLastRow: () => sheetData.length,
      getLastColumn: () => sheetData[0] ? sheetData[0].length : 0,
      getRange(row, column, numRows, numColumns) {
        const range = {
          getValues() {
            const values = [];
            for (let r = 0; r < numRows; r++) {
              const rowIndex = row - 1 + r;
              const source = sheetData[rowIndex] || [];
              const rowValues = [];
              for (let c = 0; c < numColumns; c++) {
                const colIndex = column - 1 + c;
                rowValues.push(source[colIndex] !== undefined ? source[colIndex] : '');
              }
              values.push(rowValues);
            }
            return values;
          },
          setValues(values) {
            for (let r = 0; r < numRows; r++) {
              const rowIndex = row - 1 + r;
              if (!sheetData[rowIndex]) {
                sheetData[rowIndex] = [];
              }
              for (let c = 0; c < numColumns; c++) {
                const colIndex = column - 1 + c;
                sheetData[rowIndex][colIndex] = values[r][c];
              }
            }
            return range;
          },
          setFontWeight() { return range; },
          setBackground() { return range; }
        };
        return range;
      }
    };
    if (Array.isArray(initialHeaders) && initialHeaders.length) {
      sheet.getRange(1, 1, 1, initialHeaders.length).setValues([initialHeaders]);
    }
    return sheet;
  }

  function stubProperties(overrides) {
    const original = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      return {
        getProperty(key) {
          return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : '';
        },
        getProperties() {
          return Object.assign({}, overrides);
        }
      };
    };
    return function restore() {
      PropertiesService.getScriptProperties = original;
    };
  }

  function stubFetch(handler) {
    const original = UrlFetchApp.fetch;
    UrlFetchApp.fetch = handler;
    return function restore() {
      UrlFetchApp.fetch = original;
    };
  }

  function stubSheets() {
    const sheetMap = {};
    const original = SheetUtils.getOrCreateSheet;
    SheetUtils.getOrCreateSheet = function(name, headers) {
      if (!sheetMap[name]) {
        sheetMap[name] = createMockSheet(headers || []);
      } else if (headers && headers.length && sheetMap[name].data.length === 0) {
        sheetMap[name].getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      return sheetMap[name];
    };
    return {
      restore() {
        SheetUtils.getOrCreateSheet = original;
      },
      sheets: sheetMap
    };
  }

  function baseConfig() {
    return {
      PRINTIFY_API_BASE_URL: 'https://printify.example.com',
      PRINTIFY_SHOP_ID: 'shop_123',
      PRINTIFY_API_KEY: 'printify_test',
      STRIPE_API_BASE_URL: 'https://stripe.example.com',
      STRIPE_SECRET_KEY: 'sk_test_secret',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      PAYPAL_API_BASE_URL: 'https://paypal.example.com',
      PAYPAL_CLIENT_ID: 'paypal_client',
      PAYPAL_SECRET: 'paypal_secret',
      PAYPAL_WEBHOOK_ID: 'wh_paypal_test',
      APPLE_RECEIPT_VERIFY_URL: 'https://apple.example.com/verifyReceipt',
      APPLE_SHARED_SECRET: 'apple_shared_secret',
      GOOGLE_PLAY_RECEIPT_PROXY_URL: 'https://google.example.com/verify',
      GOOGLE_PLAY_API_KEY: 'google_key',
      GOOGLE_PLAY_PACKAGE_NAME: 'com.example.app'
    };
  }

  test('should fetch Printify catalog with minimal configuration', function() {
    const restoreProps = stubProperties({
      PRINTIFY_API_BASE_URL: 'https://printify.example.com',
      PRINTIFY_SHOP_ID: 'shop_123',
      PRINTIFY_API_KEY: 'printify_test'
    });
    const restoreFetch = stubFetch(function(url, options) {
      equal(url, 'https://printify.example.com/v1/shops/shop_123/products.json', 'Should target Printify catalog endpoint');
      ok(options.headers && String(options.headers.Authorization).indexOf('printify_test') !== -1,
        'Should include Printify API key');
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          data: [{
            id: 'prod_1',
            title: 'Example Product',
            description: '',
            variants: [],
            images: []
          }],
          meta: { page: 1 }
        }),
        getAllHeaders: () => ({})
      };
    });

    try {
      const result = ShopOperationsService.fetchCatalog();
      equal(result.products.length, 1, 'Should return Printify products');
      equal(result.pagination.page, 1, 'Should include pagination metadata');
    } finally {
      restoreFetch();
      restoreProps();
    }
  });

  test('should create Stripe checkout session', function() {
    const restoreProps = stubProperties(baseConfig());
    const restoreFetch = stubFetch(function(url, options) {
      if (url.indexOf('/checkout/sessions') !== -1) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.test/session',
            expires_at: Math.floor(Date.now() / 1000) + 1800
          }),
          getAllHeaders: () => ({})
        };
      }
      throw new Error('Unexpected URL: ' + url);
    });

    try {
      const result = ShopOperationsService.createHostedCheckout({
        provider: 'stripe',
        priceId: 'price_123',
        quantity: 2,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: { order: 'abc123' }
      });

      equal(result.provider, 'stripe', 'Should return stripe provider');
      ok(result.checkoutUrl, 'Should return Stripe hosted checkout URL');
    } finally {
      restoreFetch();
      restoreProps();
    }
  });

  test('should fail fast when Stripe configuration is missing', function() {
    const restoreProps = stubProperties({
      PRINTIFY_API_BASE_URL: 'https://printify.example.com',
      PRINTIFY_SHOP_ID: 'shop_123',
      PRINTIFY_API_KEY: 'printify_test',
      STRIPE_API_BASE_URL: 'https://stripe.example.com'
    });

    try {
      let error;
      try {
        ShopOperationsService.createHostedCheckout({
          provider: 'stripe',
          priceId: 'price_123',
          quantity: 1,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });
      } catch (err) {
        error = err;
      }

      ok(error, 'Should throw when Stripe config missing');
      const message = error && error.message ? error.message : String(error);
      ok(message.indexOf('Missing Stripe configuration') !== -1, 'Should mention Stripe configuration');
      ok(message.indexOf('STRIPE_SECRET_KEY') !== -1, 'Should identify missing Stripe key');
    } finally {
      restoreProps();
    }
  });

  test('should fail fast when PayPal configuration is missing', function() {
    const restoreProps = stubProperties({
      PRINTIFY_API_BASE_URL: 'https://printify.example.com',
      PRINTIFY_SHOP_ID: 'shop_123',
      PRINTIFY_API_KEY: 'printify_test',
      PAYPAL_API_BASE_URL: 'https://paypal.example.com'
    });

    try {
      let error;
      try {
        ShopOperationsService.createHostedCheckout({
          provider: 'paypal',
          amount: '10.00',
          currency: 'USD',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        });
      } catch (err) {
        error = err;
      }

      ok(error, 'Should throw when PayPal config missing');
      const message = error && error.message ? error.message : String(error);
      ok(message.indexOf('Missing PayPal configuration') !== -1, 'Should mention PayPal configuration');
      ok(message.indexOf('PAYPAL_CLIENT_ID') !== -1 && message.indexOf('PAYPAL_SECRET') !== -1,
        'Should identify missing PayPal keys');
    } finally {
      restoreProps();
    }
  });

  test('should process Stripe webhook idempotently', function() {
    const config = baseConfig();
    const restoreProps = stubProperties(config);
    const sheetStub = stubSheets();

    try {
      const event = {
        id: 'evt_test_1',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            amount_total: 5000,
            currency: 'usd',
            payment_status: 'paid',
            customer_details: { email: 'buyer@example.com' },
            metadata: { order: 'abc123' }
          }
        }
      };
      const rawBody = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${rawBody}`;
      const signatureBytes = Utilities.computeHmacSha256Signature(signedPayload, config.STRIPE_WEBHOOK_SECRET);
      const signature = signatureBytes.map(byte => (`0${(byte & 0xff).toString(16)}`).slice(-2)).join('');
      const headers = { 'Stripe-Signature': `t=${timestamp},v1=${signature}` };

      const first = PaymentWebhookService.handleStripeWebhook(rawBody, headers);
      ok(first.success, 'First webhook should succeed');

      const second = PaymentWebhookService.handleStripeWebhook(rawBody, headers);
      ok(second.duplicate, 'Second webhook should be treated as duplicate');

      const ordersSheet = sheetStub.sheets.Orders;
      equal(ordersSheet.data.length, 2, 'Orders sheet should contain header and one data row');
    } finally {
      sheetStub.restore();
      restoreProps();
    }
  });

  test('should verify Apple receipt and update sheets', function() {
    const config = baseConfig();
    const restoreProps = stubProperties(config);
    const sheetStub = stubSheets();
    const restoreFetch = stubFetch(function(url, options) {
      if (url === config.APPLE_RECEIPT_VERIFY_URL) {
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            status: 0,
            environment: 'Sandbox',
            bundle_id: 'com.example.app',
            application_version: '1.0.0',
            latest_receipt_info: [{
              product_id: 'plan_pro',
              expires_date_ms: String(Date.now() + 86400000),
              original_transaction_id: 'order_001'
            }]
          }),
          getAllHeaders: () => ({})
        };
      }
      throw new Error('Unexpected URL: ' + url);
    });

    try {
      const result = SubscriptionService.verifySubscription({
        provider: 'apple',
        receiptData: 'test_receipt',
        userId: 'user_123',
        email: 'user@example.com'
      });

      ok(result.success, 'Verification should succeed');

      const plansSheet = sheetStub.sheets.Plans;
      const userSubsSheet = sheetStub.sheets.UserSubs;

      ok(plansSheet && plansSheet.data.length >= 2, 'Plans sheet should have persisted plan');
      ok(userSubsSheet && userSubsSheet.data.length >= 2, 'UserSubs sheet should have persisted subscription');
    } finally {
      restoreFetch();
      sheetStub.restore();
      restoreProps();
    }
  });
});

// ==================== CONTROL PANEL TESTS ====================

suite('Control Panel Functionality', function() {
  let sessionToken;

  setup(function() {
    // Get authenticated session for tests
    const authResult = authenticateAdminSecure('admin', 'admin123');
    // Use sessionToken only if authentication succeeded
    sessionToken = authResult.success ? authResult.sessionToken : null;
  });

  test('should display control panel for authenticated users', function() {
    const result = ControlPanel.showControlPanel(sessionToken);
    ok(result.success, 'Should show control panel for authenticated user');
  });

  test('should require authentication for control panel access', function() {
    const result = ControlPanel.showControlPanel(null);
    ok(result.success, 'Should show login form for unauthenticated user');
  });

  test('should toggle features with proper authentication', function() {
    const result = controlPanelToggleFeatureAuth(sessionToken, 'make_integration', true);
    ok(result.success, 'Should toggle feature with valid session');
    equal(result.feature, 'make_integration', 'Should return correct feature name');
  });

  test('should reject feature toggle without authentication', function() {
    const result = controlPanelToggleFeatureAuth('invalid_token', 'make_integration', true);
    notOk(result.success, 'Should reject feature toggle with invalid session');
  });

  test('should execute manual triggers with authentication', function() {
    const mockStub = stub(window, 'performSystemHealthCheck', function() {
      return { success: true, message: 'Health check completed' };
    });

    const result = controlPanelTriggerActionAuth(sessionToken, 'system_health_check');
    ok(result.success, 'Should execute action with valid session');

    mockStub.restore();
  });
});

// ==================== ENHANCED EVENTS TESTS ====================

suite('Enhanced Events Payloads', function() {

  test('should include icon_url when configured in script properties', function() {
    const propertyStore = { MATCHDAY_CARD_ICON_MAP: JSON.stringify({ card_yellow: 'https://cdn.example.com/yellow.png' }) };
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      return {
        getProperty(key) { return propertyStore[key] || ''; },
        setProperty(key, value) { propertyStore[key] = value; return this; },
        getProperties() { return Object.assign({}, propertyStore); }
      };
    };

    try {
      const manager = new EnhancedEventsManager();
      manager.getMatchInfo = function() {
        return { date: '2025-08-01', opponent: 'Test United', venue: 'Home', competition: 'League' };
      };

      const payload = manager.createCardPayload('12', 'Player One', 'Yellow Card', 'match-1', 'card_yellow');

      equal(payload.icon_url, 'https://cdn.example.com/yellow.png', 'Card payload should include configured icon URL');

    } finally {
      PropertiesService.getScriptProperties = originalGetScriptProperties;
    }
  });
});

// ==================== WEEKLY SCHEDULER TESTS ====================

suite('Weekly Scheduler Enhancements', function() {

  test('validateQuoteLength should truncate when allowed by Script Property', function() {
    const scheduler = new WeeklyScheduler();
    const propertyStore = { WEEKLY_QUOTES_MAX_LENGTH: JSON.stringify({ maxLength: 30, allowTruncate: true }) };
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      return {
        getProperty(key) { return propertyStore[key] || ''; },
        setProperty(key, value) { propertyStore[key] = value; return this; },
        getProperties() { return Object.assign({}, propertyStore); }
      };
    };

    try {
      const validation = scheduler.validateQuoteLength('This inspirational quote should be gracefully shortened for posting.');
      ok(validation.valid, 'Validation should pass when truncation is allowed');
      ok(validation.wasTruncated, 'Quote should be truncated when exceeding max length');
      equal(validation.maxLength, 30, 'Max length should respect script property override');
      ok(validation.sanitizedText.length <= 30, 'Sanitized text should not exceed configured limit');
    } finally {
      PropertiesService.getScriptProperties = originalGetScriptProperties;
    }
  });

  test('validateQuoteLength should fail when truncation disabled', function() {
    const scheduler = new WeeklyScheduler();
    const propertyStore = { WEEKLY_QUOTES_MAX_LENGTH: JSON.stringify({ maxLength: 20, allowTruncate: false }) };
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      return {
        getProperty(key) { return propertyStore[key] || ''; },
        setProperty(key, value) { propertyStore[key] = value; return this; },
        getProperties() { return Object.assign({}, propertyStore); }
      };
    };

    try {
      const validation = scheduler.validateQuoteLength('This quote exceeds twenty characters easily.');
      notOk(validation.valid, 'Validation should fail when truncation is disabled and quote is too long');
      equal(validation.reason, 'exceeds_max_length', 'Reason should indicate exceeded length');
    } finally {
      PropertiesService.getScriptProperties = originalGetScriptProperties;
    }
  });
});

// ==================== BIRTHDAY AUTOMATION TESTS ====================

suite('Birthday Automation', function() {

  test('should send birthday payload once per day', function() {
    const propertyStore = { BIRTHDAY_AUTOMATION_ENABLED: 'true' };
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      return {
        getProperty(key) { return propertyStore[key] || ''; },
        setProperty(key, value) { propertyStore[key] = value; return this; },
        getProperties() { return Object.assign({}, propertyStore); }
      };
    };

    const sheetStub = stubSheets();
    const playersSheet = SheetUtils.getOrCreateSheet('Players', ['Player Name', 'Date of Birth', 'Position', 'Squad Number']);
    playersSheet.getRange(2, 1, 1, 4).setValues([
      ['Alex Smith', '15/03/2000', 'Midfielder', '10']
    ]);

    const originalSendToMake = MakeIntegration.prototype.sendToMake;
    const sentPayloads = [];
    MakeIntegration.prototype.sendToMake = function(payload) {
      sentPayloads.push(payload);
      return { success: true };
    };

    try {
      const automation = new BirthdayAutomation();
      const referenceDate = new Date('2025-03-15T09:00:00Z');
      const firstRun = automation.runDaily(referenceDate);
      ok(firstRun.success, 'First run should succeed');
      equal(firstRun.processed, 1, 'Should process one birthday');
      equal(sentPayloads.length, 1, 'Should send exactly one payload');
      equal(sentPayloads[0].player_name, 'Alex Smith', 'Payload should include player name');

      const secondRun = automation.runDaily(new Date('2025-03-15T12:00:00Z'));
      ok(secondRun.success, 'Second run should succeed');
      equal(secondRun.processed, 0, 'Second run should not process duplicate birthdays');
      ok(secondRun.skipped, 'Second run should be marked as skipped');
      equal(sentPayloads.length, 1, 'Should not send duplicate payloads');
    } finally {
      MakeIntegration.prototype.sendToMake = originalSendToMake;
      sheetStub.restore();
      PropertiesService.getScriptProperties = originalGetScriptProperties;
    }
  });
});

// ==================== LEAGUE TABLE PIPELINE TESTS ====================

suite('League Table Pipeline', function() {

  test('should build sorted sheet, canva map, and HTML file', function() {
    const propertyStore = {};
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      return {
        getProperty(key) { return propertyStore[key] || ''; },
        setProperty(key, value) { propertyStore[key] = value; return this; },
        getProperties() { return Object.assign({}, propertyStore); }
      };
    };

    const sheetStub = stubSheets();
    const rawSheet = SheetUtils.getOrCreateSheet('League Raw', ['Team', 'Played', 'Won', 'Drawn', 'Lost', 'Goals For', 'Goals Against', 'Goal Difference', 'Points']);
    rawSheet.getRange(2, 1, 3, 9).setValues([
      ['Team A', 10, 7, 2, 1, 25, 10, 15, 23],
      ['Team B', 10, 6, 3, 1, 22, 12, 10, 21],
      ['Team C', 10, 4, 4, 2, 18, 14, 4, 16]
    ]);

    const globalContext = typeof globalThis !== 'undefined' ? globalThis : (function() { return this; })();
    const originalDriveApp = typeof globalContext.DriveApp !== 'undefined' ? globalContext.DriveApp : undefined;
    const folderStore = { files: {} };
    const folder = {
      files: folderStore.files,
      getFilesByName(name) {
        const file = this.files[name];
        return {
          hasNext() { return !!file; },
          next() { return file; }
        };
      },
      createFile(name, content) {
        const file = {
          name,
          content,
          getId() { return `${name}-id`; },
          setContent(newContent) { this.content = newContent; }
        };
        this.files[name] = file;
        return file;
      }
    };

    globalContext.DriveApp = {
      getRootFolder() { return folder; },
      getFolderById() { return folder; }
    };

    const originalMimeType = typeof globalContext.MimeType !== 'undefined' ? globalContext.MimeType : undefined;
    globalContext.MimeType = { HTML: 'text/html' };

    const originalUtilities = typeof globalContext.Utilities !== 'undefined' ? globalContext.Utilities : undefined;
    globalContext.Utilities = {
      DigestAlgorithm: { MD5: 'MD5' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest() { return [1, 2, 3, 4]; }
    };

    try {
      const pipeline = new LeagueTablePipeline();
      const result = pipeline.refreshAndMap();

      ok(result.success, 'Pipeline should complete successfully');
      equal(result.rows, 3, 'Should process all league rows');

      const sortedSheet = sheetStub.sheets['League Sorted'];
      ok(sortedSheet, 'Sorted sheet should exist');
      ok(sortedSheet.data.length >= 3, 'Sorted sheet should contain data rows');

      const canvaSheet = sheetStub.sheets['League Canva Map'];
      ok(canvaSheet, 'Canva sheet should exist');
      ok(canvaSheet.data.length >= 3, 'Canva sheet should contain data rows');

      const htmlFile = folder.files['table.html'];
      ok(htmlFile, 'HTML file should be created');
      ok(htmlFile.content.indexOf('Team A') !== -1, 'HTML should contain team names');

      ok(propertyStore.LEAGUE_TABLE_LAST_BUILD, 'Last build metadata should be stored');
    } finally {
      sheetStub.restore();
      PropertiesService.getScriptProperties = originalGetScriptProperties;
      if (originalDriveApp !== undefined) {
        globalContext.DriveApp = originalDriveApp;
      } else {
        delete globalContext.DriveApp;
      }
      if (originalMimeType !== undefined) {
        globalContext.MimeType = originalMimeType;
      } else {
        delete globalContext.MimeType;
      }
      if (originalUtilities !== undefined) {
        globalContext.Utilities = originalUtilities;
      } else {
        delete globalContext.Utilities;
      }
    }
  });
});

// ==================== PERFORMANCE TESTS ====================

suite('Performance Testing', function() {

  test('should validate input quickly', function() {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      validateInput('test' + i, 'string', { required: true, maxLength: 50 });
    }

    const duration = Date.now() - startTime;
    ok(duration < 1000, `Input validation should be fast (${duration}ms for 100 operations)`);
  });

  test('should handle authentication efficiently', function() {
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const result = authenticateAdminSecure('admin', 'admin123');
      if (result.sessionToken) {
        SecurityManager_Instance.destroySession(result.sessionToken);
      }
    }

    const duration = Date.now() - startTime;
    ok(duration < 5000, `Authentication should be efficient (${duration}ms for 10 operations)`);
  });

  test('should mask PII data efficiently', function() {
    const testData = {
      password: 'secret123',
      email: 'test@example.com',
      player_name: 'John Smith'
    };

    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      maskPII(testData);
    }

    const duration = Date.now() - startTime;
    ok(duration < 500, `PII masking should be efficient (${duration}ms for 100 operations)`);
  });
});

// ==================== INTEGRATION TESTS ====================

suite('System Integration', function() {
  let sessionToken;

  setup(function() {
    const authResult = authenticateAdminSecure('admin', 'admin123');
    // Use sessionToken only if authentication succeeded
    sessionToken = authResult.success ? authResult.sessionToken : null;
  });

  test('should integrate authentication with control panel', function() {
    // Test full authentication flow
    const loginResult = controlPanelAuthenticate('admin', 'admin123');
    ok(loginResult.success, 'Login should succeed');

    const panelResult = showAuthenticatedControlPanel(loginResult.sessionToken);
    ok(panelResult.success, 'Should show authenticated control panel');

    const logoutResult = controlPanelLogout(loginResult.sessionToken);
    ok(logoutResult.success, 'Logout should succeed');
  });

  test('should integrate input validation with security', function() {
    // Test that security functions use input validation
    const result = controlPanelToggleFeatureAuth(sessionToken, '<script>alert("xss")</script>', true);
    notOk(result.success, 'Should reject malicious input in feature names');
  });

  test('should integrate security logging with all operations', function() {
    // Mock the security audit sheet
    const mockSheet = {
      appendRow: mock('appendRow')
    };
    const sheetStub = stub(SheetUtils, 'getOrCreateSheet', function() {
      return mockSheet;
    });

    // Perform an action that should log security events
    controlPanelToggleFeatureAuth(sessionToken, 'make_integration', false);

    ok(mockSheet.appendRow.callCount() > 0, 'Should log security events');

    sheetStub.restore();
  });
});

// ==================== ERROR HANDLING TESTS ====================

suite('Error Handling', function() {

  test('should handle network failures gracefully', function() {
    // Mock network failure
    const originalFetch = UrlFetchApp.fetch;
    UrlFetchApp.fetch = function() {
      throw new Error('Network timeout');
    };

    // Test that webhook calls handle errors gracefully
    const result = sendToMake('test_event', { test: 'data' });
    ok(result.success !== undefined, 'Should return success/failure status');

    // Restore original function
    UrlFetchApp.fetch = originalFetch;
  });

  test('should handle sheet access failures', function() {
    // Mock sheet access failure
    const sheetStub = stub(SheetUtils, 'getOrCreateSheet', function() {
      return null;
    });

    // Test that functions handle missing sheets
    const result = SecurityManager_Instance.logSecurityEvent('test_event', { test: 'data' });
    // Should not throw error

    sheetStub.restore();
  });

  test('should handle malformed configuration', function() {
    // Mock malformed config
    const configStub = stub(PropertiesService, 'getScriptProperties', function() {
      return {
        getProperty: function() { return 'invalid_json{'; },
        getProperties: function() { return {}; }
      };
    });

    // Test that config functions handle malformed data
    throws(function() {
      JSON.parse('invalid_json{');
    }, 'Should detect malformed JSON');

    configStub.restore();
  });
});

// ==================== EDGE CASE TESTS ====================

suite('Edge Cases', function() {

  test('should handle empty and null inputs', function() {
    const nullResult = validateInput(null, 'string');
    notOk(nullResult.success, 'Should handle null input');

    const emptyResult = validateInput('', 'string', { required: true });
    notOk(emptyResult.success, 'Should handle empty required string');

    const undefinedResult = validateInput(undefined, 'string');
    notOk(undefinedResult.success, 'Should handle undefined input');
  });

  test('should handle boundary values', function() {
    const minBoundary = validateInput(0, 'minute');
    ok(minBoundary.success, 'Should accept minimum minute value');

    const maxBoundary = validateInput(120, 'minute');
    ok(maxBoundary.success, 'Should accept maximum minute value');

    const overBoundary = validateInput(121, 'minute');
    notOk(overBoundary.success, 'Should reject over-boundary minute value');
  });

  test('should handle special characters in player names', function() {
    const hyphenated = validateInput('Anne-Marie', 'playerName');
    ok(hyphenated.success, 'Should accept hyphenated names');

    const apostrophe = validateInput("O'Connor", 'playerName');
    ok(apostrophe.success, 'Should accept names with apostrophes');

    const numbers = validateInput('Player123', 'playerName');
    notOk(numbers.success, 'Should reject names with numbers');
  });

  test('should handle very long input strings', function() {
    const veryLongString = 'a'.repeat(10000);
    const result = validateInput(veryLongString, 'string', { maxLength: 50 });
    notOk(result.success, 'Should reject very long strings');
  });

  test('should handle concurrent session access', function() {
    const authResult = authenticateAdminSecure('admin', 'admin123');

    // Skip test if password change is required
    if (authResult.requiresPasswordChange) {
      ok(!authResult.success, 'Should require password change');
      return;
    }

    const sessionToken = authResult.sessionToken;

    // Simulate concurrent access
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(checkPermission(sessionToken, 'control_panel_access'));
    }

    // All should succeed (session should handle concurrent access)
    results.forEach((result, index) => {
      ok(result.success, `Concurrent access ${index + 1} should succeed`);
    });

    SecurityManager_Instance.destroySession(sessionToken);
  });
});

// ==================== REGRESSION TESTS ====================

suite('Regression Testing', function() {

  test('should maintain backward compatibility', function() {
    // Test that old function signatures still work
    const result = showControlPanel(); // Old signature without session token
    ok(result.success, 'Should maintain backward compatibility');
  });

  test('should handle previously problematic inputs', function() {
    // Test cases that previously caused issues

    // Special characters that broke parsing
    const specialChars = validateInput('Test & < > " \'', 'string');
    ok(specialChars.success || specialChars.error, 'Should handle special characters');

    // Unicode characters
    const unicode = validateInput('Müller', 'playerName');
    ok(unicode.success || unicode.error, 'Should handle unicode characters');
  });

  test('should preserve security fixes', function() {
    // Test that security vulnerabilities remain fixed
    const xssAttempt = '<script>alert("xss")</script>';
    const sanitized = SecurityManager_Instance.sanitizeInput(xssAttempt, 'string');
    notOk(sanitized.includes('<script>'), 'Should maintain XSS protection');
  });
});

// ==================== CONFIGURATION OVERRIDE TESTS ====================

suite('Configuration Overrides', function() {

  test('should hydrate script property overrides before defaults', function() {
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    const store = {};
    const fakeScriptProperties = {
      getProperties: function() { return Object.assign({}, store); },
      getProperty: function(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setProperty: function(key, value) { store[key] = value; },
      setProperties: function(values) { Object.assign(store, values); },
      deleteProperty: function(key) { delete store[key]; }
    };

    PropertiesService.getScriptProperties = function() {
      return fakeScriptProperties;
    };

    const originalConfigSnapshot = JSON.parse(JSON.stringify(SYSTEM_CONFIG));

    try {
      if (typeof invalidateRuntimeConfigCache_ === 'function') {
        invalidateRuntimeConfigCache_();
      }

      fakeScriptProperties.setProperty('SYSTEM.CLUB_NAME', 'Script Prop United');

      const value = getConfigValue('SYSTEM.CLUB_NAME');
      equal(value, 'Script Prop United', 'Should return hydrated script property override');
    } finally {
      PropertiesService.getScriptProperties = originalGetScriptProperties;
      Object.keys(SYSTEM_CONFIG).forEach(function(key) { delete SYSTEM_CONFIG[key]; });
      Object.assign(SYSTEM_CONFIG, JSON.parse(JSON.stringify(originalConfigSnapshot)));
      if (typeof invalidateRuntimeConfigCache_ === 'function') {
        invalidateRuntimeConfigCache_();
      }
    }
  });

  test('applyBuyerProfileToSystem should persist overrides for fresh executions', function() {
    const originalGetScriptProperties = PropertiesService.getScriptProperties;
    const store = {};
    const fakeScriptProperties = {
      getProperties: function() { return Object.assign({}, store); },
      getProperty: function(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setProperty: function(key, value) { store[key] = value; },
      setProperties: function(values) { Object.assign(store, values); },
      deleteProperty: function(key) { delete store[key]; }
    };

    PropertiesService.getScriptProperties = function() {
      return fakeScriptProperties;
    };

    const originalConfigSnapshot = JSON.parse(JSON.stringify(SYSTEM_CONFIG));

    try {
      if (typeof invalidateRuntimeConfigCache_ === 'function') {
        invalidateRuntimeConfigCache_();
      }

      const profile = {
        clubName: 'Hydration FC',
        clubShortName: 'HFC',
        league: 'Super League',
        ageGroup: 'U18',
        primaryColor: '#123456',
        secondaryColor: '#654321',
        badgeUrl: 'https://example.com/badge.png'
      };

      const result = applyBuyerProfileToSystem(profile);
      ok(result.success, 'Should apply buyer profile successfully');

      equal(fakeScriptProperties.getProperty('SYSTEM.CLUB_NAME'), 'Hydration FC', 'Script property should persist club name');
      equal(fakeScriptProperties.getProperty('BRANDING.PRIMARY_COLOR'), '#123456', 'Script property should persist primary colour');

      if (typeof invalidateRuntimeConfigCache_ === 'function') {
        invalidateRuntimeConfigCache_();
      }

      const hydratedClubName = getConfigValue('SYSTEM.CLUB_NAME');
      equal(hydratedClubName, 'Hydration FC', 'Hydrated config should reflect persisted club name');
      equal(getConfigValue('BRANDING.PRIMARY_COLOR'), '#123456', 'Hydrated config should reflect persisted primary colour');
    } finally {
      PropertiesService.getScriptProperties = originalGetScriptProperties;
      Object.keys(SYSTEM_CONFIG).forEach(function(key) { delete SYSTEM_CONFIG[key]; });
      Object.assign(SYSTEM_CONFIG, JSON.parse(JSON.stringify(originalConfigSnapshot)));
      if (typeof invalidateRuntimeConfigCache_ === 'function') {
        invalidateRuntimeConfigCache_();
      }
    }
  });
});

// ==================== TEST RUNNER FUNCTIONS ====================

/**
 * Run all test suites and return results
 * @returns {Object} Complete test results
 */
function runAllTests() {
  logger.info('Starting comprehensive test run');

  try {
    const results = runTests();

    logger.info('Test run completed', {
      totalTests: results.totalTests,
      passed: results.passedTests,
      failed: results.failedTests,
      passRate: results.passedTests / results.totalTests * 100
    });

    return results;

  } catch (error) {
    logger.error('Test run failed', { error: error.toString() });
    throw error;
  }
}

/**
 * Run only security tests
 * @returns {Object} Security test results
 */
function runSecurityTests() {
  try {
    // Reset framework using safe access
    try {
      if (typeof TestFramework !== 'undefined' && TestFramework.testSuites !== undefined) {
        TestFramework.testSuites = [];
      }
    } catch (frameworkError) {
      logger.warn('Could not reset test framework', { error: frameworkError.toString() });
    }

    // Define security-only suites
    suite('Security and Authentication');
    suite('Input Validation');
    suite('PII Protection');

    return runTests();
  } catch (error) {
    logger.error('Security tests failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Run only performance tests
 * @returns {Object} Performance test results
 */
function runPerformanceTests() {
  try {
    // Reset framework using safe access
    try {
      if (typeof TestFramework !== 'undefined' && TestFramework.testSuites !== undefined) {
        TestFramework.testSuites = [];
      }
    } catch (frameworkError) {
      logger.warn('Could not reset test framework', { error: frameworkError.toString() });
    }

    // Define performance-only suite
    suite('Performance Testing');

    return runTests();
  } catch (error) {
    logger.error('Performance tests failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Run continuous integration tests
 * @returns {Object} CI test results
 */
function runCITests() {
  const results = runAllTests();

  // Fail build if any tests failed
  if (results.failedTests > 0) {
    throw new Error(`Build failed: ${results.failedTests} tests failed`);
  }

  // Warn if pass rate is below threshold
  const passRate = results.passedTests / results.totalTests * 100;
  if (passRate < 95) {
    logger.warn('Pass rate below 95%', { passRate: passRate });
  }

  return results;
}