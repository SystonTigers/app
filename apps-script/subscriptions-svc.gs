/**
 * @fileoverview Subscription service providing plan retrieval and receipt verification.
 * @version 6.3.0
 */

class SubscriptionService {
  static get logger() {
    if (!this.loggerInstance_) {
      try {
        this.loggerInstance_ = logger.scope('SubscriptionService');
      } catch (error) {
        this.loggerInstance_ = {
          enterFunction() {},
          exitFunction() {},
          info: () => {},
          warn: () => {},
          error: (message, context) => console.error(`[SubscriptionService] ${message}`, context || {})
        };
      }
    }
    return this.loggerInstance_;
  }

  static listPlans() {
    const headers = ['PlanId', 'Provider', 'Name', 'Price', 'Currency', 'Interval', 'Active', 'Metadata', 'LastVerified'];
    const sheet = SheetUtils.getOrCreateSheet('Plans', headers);
    if (!sheet) {
      throw new Error('Plans sheet unavailable');
    }

    const normalizedHeaders = this.ensureHeaders_(sheet, headers);
    const records = this.readSheetRecords_(sheet, normalizedHeaders);

    return records
      .map(record => record.values)
      .filter(plan => String(plan.Active || '').toLowerCase() !== 'false');
  }

  static getUserSubscriptions(identifier) {
    const headers = ['UserId', 'Email', 'PlanId', 'Provider', 'Status', 'CurrentPeriodEnd', 'LastReceiptCheck', 'ReceiptId', 'Metadata', 'UpdatedAt'];
    const sheet = SheetUtils.getOrCreateSheet('UserSubs', headers);
    if (!sheet) {
      throw new Error('UserSubs sheet unavailable');
    }

    const normalizedHeaders = this.ensureHeaders_(sheet, headers);
    const records = this.readSheetRecords_(sheet, normalizedHeaders);

    return records
      .map(record => record.values)
      .filter(record => {
        if (!identifier) return true;
        const userIdMatch = record.UserId && identifier.userId && record.UserId === identifier.userId;
        const emailMatch = record.Email && identifier.email && record.Email === identifier.email;
        return userIdMatch || emailMatch;
      });
  }

  static verifySubscription(request) {
    if (!request || typeof request !== 'object') {
      throw new Error('Verification payload required');
    }

    const provider = String(request.provider || '').trim().toLowerCase();
    if (!provider) {
      throw new Error('Provider is required for verification');
    }

    if (!request.userId && !request.email) {
      throw new Error('User identifier (userId or email) required');
    }

    const verification = SubscriptionVerificationWorker.verify(provider, request);

    if (!verification.success) {
      return verification;
    }

    this.ensurePlanRecord_(verification.plan);
    const subscription = this.upsertUserSubscription_({
      userId: request.userId || '',
      email: request.email || '',
      planId: verification.plan.planId,
      provider: verification.plan.provider,
      status: verification.status,
      currentPeriodEnd: verification.expiryDate || '',
      receiptId: verification.receiptId,
      metadata: verification.metadata || {}
    });

    return {
      success: true,
      subscription
    };
  }

  static ensurePlanRecord_(plan) {
    if (!plan || !plan.planId) {
      return;
    }

    const headers = ['PlanId', 'Provider', 'Name', 'Price', 'Currency', 'Interval', 'Active', 'Metadata', 'LastVerified'];
    const sheet = SheetUtils.getOrCreateSheet('Plans', headers);
    if (!sheet) {
      throw new Error('Plans sheet unavailable');
    }

    const normalizedHeaders = this.ensureHeaders_(sheet, headers);
    const records = this.readSheetRecords_(sheet, normalizedHeaders);
    const existing = records.find(record => record.values.PlanId === plan.planId);
    const rowData = {
      PlanId: plan.planId,
      Provider: plan.provider,
      Name: plan.name || '',
      Price: plan.price || '',
      Currency: plan.currency || '',
      Interval: plan.interval || '',
      Active: plan.active === false ? 'FALSE' : 'TRUE',
      Metadata: plan.metadata ? JSON.stringify(plan.metadata) : '',
      LastVerified: new Date().toISOString()
    };

    if (existing) {
      this.writeRow_(sheet, normalizedHeaders, existing.rowNumber, rowData);
      return;
    }

    const rowNumber = records.length + 2;
    this.writeRow_(sheet, normalizedHeaders, rowNumber, rowData);
  }

  static upsertUserSubscription_(payload) {
    const headers = ['UserId', 'Email', 'PlanId', 'Provider', 'Status', 'CurrentPeriodEnd', 'LastReceiptCheck', 'ReceiptId', 'Metadata', 'UpdatedAt'];
    const sheet = SheetUtils.getOrCreateSheet('UserSubs', headers);
    if (!sheet) {
      throw new Error('UserSubs sheet unavailable');
    }

    const normalizedHeaders = this.ensureHeaders_(sheet, headers);
    const records = this.readSheetRecords_(sheet, normalizedHeaders);

    const identifier = payload.receiptId || (payload.userId + '::' + payload.planId);
    const existing = records.find(record => record.values.ReceiptId === payload.receiptId || (
      record.values.UserId === payload.userId && record.values.PlanId === payload.planId
    ));

    const rowData = {
      UserId: payload.userId,
      Email: payload.email,
      PlanId: payload.planId,
      Provider: payload.provider,
      Status: payload.status,
      CurrentPeriodEnd: payload.currentPeriodEnd || '',
      LastReceiptCheck: new Date().toISOString(),
      ReceiptId: payload.receiptId || identifier,
      Metadata: payload.metadata ? JSON.stringify(payload.metadata) : '',
      UpdatedAt: new Date().toISOString()
    };

    if (existing) {
      this.writeRow_(sheet, normalizedHeaders, existing.rowNumber, rowData);
      return rowData;
    }

    const rowNumber = records.length + 2;
    this.writeRow_(sheet, normalizedHeaders, rowNumber, rowData);
    return rowData;
  }

  static ensureHeaders_(sheet, headers) {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      return headers;
    }

    const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const missing = headers.filter(header => !current.includes(header));

    if (missing.length > 0) {
      const combined = current.concat(missing);
      sheet.getRange(1, 1, 1, combined.length).setValues([combined]);
      return combined;
    }

    return current;
  }

  static readSheetRecords_(sheet, headers) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }

    const range = sheet.getRange(2, 1, lastRow - 1, headers.length);
    const values = range.getValues();

    return values.map((row, index) => {
      const entry = {};
      headers.forEach((header, idx) => {
        entry[header] = row[idx];
      });
      return {
        rowNumber: index + 2,
        values: entry
      };
    });
  }

  static writeRow_(sheet, headers, rowNumber, data) {
    const row = headers.map(header => data[header] !== undefined ? data[header] : '');
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  }

  static handleGet(path, params) {
    switch (path) {
      case 'subs/plans': {
        const plans = this.listPlans();
        return this.jsonResponse_({ success: true, plans });
      }
      case 'subs/me': {
        const identifier = {
          userId: params?.userId ? String(params.userId) : '',
          email: params?.email ? String(params.email) : ''
        };
        const subs = this.getUserSubscriptions(identifier);
        return this.jsonResponse_({ success: true, subscriptions: subs });
      }
      default:
        return this.jsonResponse_({ success: false, error: 'Unsupported subscription endpoint' }, 404);
    }
  }

  static handlePost(path, body, params) {
    switch (path) {
      case 'subs/verify': {
        const result = this.verifySubscription({
          provider: body?.provider,
          receiptData: body?.receiptData,
          purchaseToken: body?.purchaseToken,
          productId: body?.productId,
          userId: body?.userId || params?.userId,
          email: body?.email || params?.email,
          planId: body?.planId,
          packageName: body?.packageName
        });
        return this.jsonResponse_(result, result.success ? 200 : 400);
      }
      default:
        return this.jsonResponse_({ success: false, error: 'Unsupported subscription endpoint' }, 404);
    }
  }

  static jsonResponse_(payload, status = 200) {
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

class SubscriptionVerificationWorker {
  static get logger() {
    if (!this.loggerInstance_) {
      try {
        this.loggerInstance_ = logger.scope('SubscriptionWorker');
      } catch (error) {
        this.loggerInstance_ = {
          enterFunction() {},
          exitFunction() {},
          info: () => {},
          warn: () => {},
          error: (message, context) => console.error(`[SubscriptionWorker] ${message}`, context || {})
        };
      }
    }
    return this.loggerInstance_;
  }

  static get httpClient() {
    if (!this.httpClientInstance_) {
      this.httpClientInstance_ = new HttpClient();
    }
    return this.httpClientInstance_;
  }

  static verify(provider, request) {
    try {
      switch (provider) {
        case 'apple':
          return this.verifyAppleReceipt_(request);
        case 'google':
          return this.verifyGoogleReceipt_(request);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error('Receipt verification failed', { provider, error: error.toString() });
      return { success: false, error: error.message || String(error) };
    }
  }

  static verifyAppleReceipt_(request) {
    if (!request.receiptData) {
      throw new Error('Apple receipt data is required');
    }

    const config = this.getAppleConfig_();
    const payload = {
      'receipt-data': request.receiptData,
      password: config.sharedSecret,
      'exclude-old-transactions': true
    };

    const response = this.httpClient.fetch(config.verifyUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (!response.success) {
      throw new Error('Apple verification request failed');
    }

    const result = this.parseJson_(response.content, 'apple_receipt');
    if (result.status !== 0) {
      throw new Error(`Apple receipt invalid (status ${result.status})`);
    }

    const latest = Array.isArray(result.latest_receipt_info) && result.latest_receipt_info.length
      ? result.latest_receipt_info[result.latest_receipt_info.length - 1]
      : {};

    const planId = request.planId || latest.product_id || '';
    const expiry = latest.expires_date_ms ? new Date(Number(latest.expires_date_ms)).toISOString() : '';
    const receiptId = latest.original_transaction_id || latest.transaction_id || Utilities.getUuid();

    return {
      success: true,
      status: 'active',
      expiryDate: expiry,
      receiptId,
      metadata: {
        productId: latest.product_id || '',
        environment: result.environment || ''
      },
      plan: {
        planId,
        provider: 'APPLE',
        name: latest.product_id || planId,
        price: latest.price || '',
        currency: latest.currency || '',
        interval: latest.subscription_group_identifier || '',
        metadata: {
          bundleId: result.bundle_id || '',
          applicationVersion: result.application_version || ''
        }
      }
    };
  }

  static verifyGoogleReceipt_(request) {
    const token = request.purchaseToken || request.receiptData;
    if (!token) {
      throw new Error('Google purchase token is required');
    }

    const config = this.getGoogleConfig_();
    const payload = {
      packageName: request.packageName || config.packageName,
      productId: request.productId || request.planId,
      purchaseToken: token
    };

    const headers = config.apiKey ? { 'X-Api-Key': config.apiKey } : {};

    const response = this.httpClient.fetch(config.verifyUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers,
      muteHttpExceptions: true
    });

    if (!response.success) {
      throw new Error('Google verification request failed');
    }

    const result = this.parseJson_(response.content, 'google_receipt');
    const expiry = result.expiryTimeMillis ? new Date(Number(result.expiryTimeMillis)).toISOString() : '';
    const status = result.purchaseState === 1 ? 'canceled' : 'active';
    const receiptId = result.orderId || token;

    return {
      success: true,
      status,
      expiryDate: expiry,
      receiptId,
      metadata: {
        acknowledged: !!result.acknowledgementState,
        countryCode: result.countryCode || ''
      },
      plan: {
        planId: request.planId || result.productId || '',
        provider: 'GOOGLE',
        name: result.productId || '',
        price: result.priceAmountMicros ? (Number(result.priceAmountMicros) / 1e6).toFixed(2) : '',
        currency: result.priceCurrencyCode || '',
        interval: result.subscriptionPeriod || '',
        metadata: {
          packageName: payload.packageName,
          developerPayload: result.developerPayload || ''
        }
      }
    };
  }

  static getAppleConfig_() {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      verifyUrl: properties.getProperty('APPLE_RECEIPT_VERIFY_URL'),
      sharedSecret: properties.getProperty('APPLE_SHARED_SECRET')
    };

    const missing = Object.entries(config)
      .filter(([, value]) => !value || String(value).trim() === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing Apple receipt configuration: ${missing.join(', ')}`);
    }

    return config;
  }

  static getGoogleConfig_() {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      verifyUrl: properties.getProperty('GOOGLE_PLAY_RECEIPT_PROXY_URL'),
      apiKey: properties.getProperty('GOOGLE_PLAY_API_KEY'),
      packageName: properties.getProperty('GOOGLE_PLAY_PACKAGE_NAME')
    };

    if (!config.verifyUrl) {
      throw new Error('Missing Google receipt configuration: GOOGLE_PLAY_RECEIPT_PROXY_URL');
    }

    return config;
  }

  static parseJson_(content, context) {
    try {
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to parse JSON', { context, error: error.toString() });
      throw new Error(`Invalid ${context} response`);
    }
  }
}

function runSubscriptionReceiptWorker(provider, payload) {
  return SubscriptionVerificationWorker.verify(provider, payload || {});
}
