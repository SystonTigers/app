/**
 * @fileoverview Unit tests for shared API helpers.
 */

suite('API Helpers - JWT', function() {
  test('verifies valid JWT tokens', function() {
    var props = PropertiesService.getScriptProperties();
    var previous = props.getProperty('API_JWT_SECRET');
    props.setProperty('API_JWT_SECRET', 'unit-test-secret');
    CacheService.getScriptCache().remove && CacheService.getScriptCache().remove(API_CONFIG_CACHE_KEY);

    var header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '');
    var payloadObject = {
      sub: 'user123',
      scope: 'events:read',
      exp: Math.floor(Date.now() / 1000) + 60
    };
    var payload = Utilities.base64EncodeWebSafe(JSON.stringify(payloadObject)).replace(/=+$/, '');
    var signature = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(header + '.' + payload, 'unit-test-secret', Utilities.Charset.UTF_8)
    ).replace(/=+$/, '');
    var token = header + '.' + payload + '.' + signature;

    var result = verifyJwt(token);
    ok(result.valid, 'Token should be valid.');
    equal(result.claims.sub, 'user123', 'Should expose subject claim.');

    if (previous) {
      props.setProperty('API_JWT_SECRET', previous);
    } else {
      props.deleteProperty('API_JWT_SECRET');
    }
    CacheService.getScriptCache().remove && CacheService.getScriptCache().remove(API_CONFIG_CACHE_KEY);
  });

  test('rejects expired tokens', function() {
    var props = PropertiesService.getScriptProperties();
    var previous = props.getProperty('API_JWT_SECRET');
    props.setProperty('API_JWT_SECRET', 'unit-test-secret');
    CacheService.getScriptCache().remove && CacheService.getScriptCache().remove(API_CONFIG_CACHE_KEY);

    var header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '');
    var payload = Utilities.base64EncodeWebSafe(JSON.stringify({ sub: 'user123', exp: Math.floor(Date.now() / 1000) - 10 })).replace(/=+$/, '');
    var signature = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(header + '.' + payload, 'unit-test-secret', Utilities.Charset.UTF_8)
    ).replace(/=+$/, '');
    var token = header + '.' + payload + '.' + signature;

    var result = verifyJwt(token);
    notOk(result.valid, 'Expired token should be rejected.');

    if (previous) {
      props.setProperty('API_JWT_SECRET', previous);
    } else {
      props.deleteProperty('API_JWT_SECRET');
    }
    CacheService.getScriptCache().remove && CacheService.getScriptCache().remove(API_CONFIG_CACHE_KEY);
  });
});

suite('API Helpers - Validation', function() {
  test('validates schema and returns sanitised payload', function() {
    var schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 3 },
        count: { type: 'number', minimum: 1 }
      }
    };
    var result = validateSchema(schema, { name: ' Sample ', count: '2' });
    ok(result.valid, 'Payload should be valid.');
    equal(result.value.name, 'Sample', 'Name should be trimmed.');
    equal(result.value.count, 2, 'Count should be cast to number.');
  });

  test('fails schema validation with helpful errors', function() {
    var schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 3 }
      }
    };
    var result = validateSchema(schema, { name: 'ok' });
    notOk(result.valid, 'String shorter than requirement should fail validation.');
    ok(result.errors.length > 0, 'Validation errors should be returned.');
  });
});

suite('API Helpers - Rate limiting', function() {
  test('enforces per-IP and per-user limits', function() {
    var props = PropertiesService.getScriptProperties();
    var original = {
      ip: props.getProperty('API_RATE_LIMIT_IP'),
      user: props.getProperty('API_RATE_LIMIT_USER'),
      window: props.getProperty('API_RATE_LIMIT_WINDOW_SECONDS')
    };
    props.setProperties({
      API_RATE_LIMIT_IP: '2',
      API_RATE_LIMIT_USER: '2',
      API_RATE_LIMIT_WINDOW_SECONDS: '60'
    }, true);
    CacheService.getScriptCache().remove && CacheService.getScriptCache().remove(API_CONFIG_CACHE_KEY);

    var identifier = 'unit-ip-' + Utilities.getUuid();
    var userId = 'user-' + Utilities.getUuid();
    var first = evaluateRateLimit({ ip: identifier, userId: userId });
    var second = evaluateRateLimit({ ip: identifier, userId: userId });
    var third = evaluateRateLimit({ ip: identifier, userId: userId });

    ok(first.allowed, 'First request should pass.');
    ok(second.allowed, 'Second request should pass.');
    notOk(third.allowed, 'Third request should be limited.');

    if (original.ip) {
      props.setProperty('API_RATE_LIMIT_IP', original.ip);
    } else {
      props.deleteProperty('API_RATE_LIMIT_IP');
    }
    if (original.user) {
      props.setProperty('API_RATE_LIMIT_USER', original.user);
    } else {
      props.deleteProperty('API_RATE_LIMIT_USER');
    }
    if (original.window) {
      props.setProperty('API_RATE_LIMIT_WINDOW_SECONDS', original.window);
    } else {
      props.deleteProperty('API_RATE_LIMIT_WINDOW_SECONDS');
    }
    CacheService.getScriptCache().remove && CacheService.getScriptCache().remove(API_CONFIG_CACHE_KEY);
  });
});

suite('API Helpers - Idempotency', function() {
  test('stores and retrieves cached responses', function() {
    var key = 'idem-' + Utilities.getUuid();
    var payload = { status: 200, body: { ok: true }, headers: { 'X-Test': '1' } };
    storeIdempotentResponse(key, payload);
    var stored = getStoredIdempotentResponse(key);
    ok(stored, 'Stored response should be retrievable.');
    equal(stored.body.ok, true, 'Stored payload should match.');
  });
});

suite('Make Integration - Backend headers', function() {
  test('scopes idempotency key per tenant and sets headers', function() {
    var props = PropertiesService.getScriptProperties();
    var original = {
      backendUrl: props.getProperty('BACKEND_API_URL'),
      automationJwt: props.getProperty('AUTOMATION_JWT'),
      tenantId: props.getProperty('TENANT_ID')
    };

    props.setProperty('BACKEND_API_URL', 'https://example.test');
    props.setProperty('AUTOMATION_JWT', 'unit-test-token');
    props.setProperty('TENANT_ID', 'tenant-unit');

    var capturedHeaders;

    try {
      var integration = new MakeIntegration();
      var payload = { event_type: 'unit_test_event' };
      var resolvedKey = integration.resolveIdempotencyKey(payload, {});

      var hooks = {
        backend_post_attempt_start: function(context) {
          capturedHeaders = context && context.headers;
          return {
            mockResponse: {
              getResponseCode: function() { return 200; },
              getContentText: function() { return JSON.stringify({ job_id: 'mock-job' }); }
            }
          };
        }
      };

      var result = integration.postToBackend(payload, {
        idempotencyKey: resolvedKey,
        testHooks: hooks
      });

      ok(result.success, 'Mocked backend call should succeed.');
      ok(capturedHeaders, 'Hook should capture headers.');
      equal(capturedHeaders['Idempotency-Key'], 'tenant-unit:' + resolvedKey,
        'Scoped idempotency key should include tenant.');
      equal(capturedHeaders['X-Tenant-Id'], 'tenant-unit', 'Tenant header should be set.');
    } finally {
      if (original.backendUrl) {
        props.setProperty('BACKEND_API_URL', original.backendUrl);
      } else {
        props.deleteProperty('BACKEND_API_URL');
      }

      if (original.automationJwt) {
        props.setProperty('AUTOMATION_JWT', original.automationJwt);
      } else {
        props.deleteProperty('AUTOMATION_JWT');
      }

      if (original.tenantId) {
        props.setProperty('TENANT_ID', original.tenantId);
      } else {
        props.deleteProperty('TENANT_ID');
      }
    }
  });
});
