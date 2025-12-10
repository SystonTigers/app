/**
 * @fileoverview Payment webhook handlers for Stripe and PayPal providers.
 * @version 6.3.0
 */

class PaymentWebhookService {
  static get logger() {
    if (!this.loggerInstance_) {
      try {
        this.loggerInstance_ = logger.scope('PaymentWebhook');
      } catch (error) {
        this.loggerInstance_ = {
          enterFunction() {},
          exitFunction() {},
          info: () => {},
          warn: () => {},
          error: (message, context) => console.error(`[PaymentWebhook] ${message}`, context || {})
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

  static handleStripeWebhookRequest(e) {
    const rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    const headers = (e && e.headers) ? e.headers : {};

    const result = this.handleStripeWebhook(rawBody, headers);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  static handlePayPalWebhookRequest(e) {
    const rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    const headers = (e && e.headers) ? e.headers : {};

    const result = this.handlePayPalWebhook(rawBody, headers);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  static handleStripeWebhook(rawBody, headers) {
    if (!rawBody) {
      throw new Error('Empty Stripe webhook payload');
    }

    const config = this.getStripeConfig_();
    const signatureHeader = headers['Stripe-Signature'] || headers['stripe-signature'] || '';
    const parsedSignature = this.parseStripeSignature_(signatureHeader);

    const expectedSignature = this.computeStripeSignature_(parsedSignature.timestamp, rawBody, config.webhookSecret);
    const signatureValid = parsedSignature.signatures.some(signature => this.timingSafeEqual_(signature, expectedSignature));

    if (!signatureValid) {
      this.logger.warn('Stripe webhook signature invalid');
      throw new Error('Invalid Stripe signature');
    }

    const event = this.parseJson_(rawBody, 'stripe_webhook');
    const orderData = this.mapStripeEventToOrder_(event);

    if (!orderData.orderId) {
      this.logger.warn('Stripe event missing order identifier', { eventId: event?.id });
      return { success: true, ignored: true };
    }

    const upsert = this.upsertOrder_(orderData);

    this.logger.info('Stripe webhook processed', {
      eventId: event?.id,
      updated: upsert.updated,
      duplicate: upsert.duplicate
    });

    return { success: true, updated: upsert.updated, duplicate: upsert.duplicate };
  }

  static handlePayPalWebhook(rawBody, headers) {
    if (!rawBody) {
      throw new Error('Empty PayPal webhook payload');
    }

    const config = this.getPayPalConfig_();
    const event = this.parseJson_(rawBody, 'paypal_webhook');

    const verification = this.verifyPayPalSignature_(rawBody, headers, config);
    if (!verification) {
      this.logger.warn('PayPal webhook verification failed');
      throw new Error('Invalid PayPal webhook signature');
    }

    const orderData = this.mapPayPalEventToOrder_(event);

    if (!orderData.orderId) {
      this.logger.warn('PayPal event missing order identifier', { eventId: event?.id });
      return { success: true, ignored: true };
    }

    const upsert = this.upsertOrder_(orderData);

    this.logger.info('PayPal webhook processed', {
      eventId: event?.id,
      updated: upsert.updated,
      duplicate: upsert.duplicate
    });

    return { success: true, updated: upsert.updated, duplicate: upsert.duplicate };
  }

  static getStripeConfig_() {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      webhookSecret: properties.getProperty('STRIPE_WEBHOOK_SECRET')
    };

    if (!config.webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET property');
    }

    return config;
  }

  static getPayPalConfig_() {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      apiBaseUrl: properties.getProperty('PAYPAL_API_BASE_URL'),
      clientId: properties.getProperty('PAYPAL_CLIENT_ID'),
      secret: properties.getProperty('PAYPAL_SECRET'),
      webhookId: properties.getProperty('PAYPAL_WEBHOOK_ID')
    };

    const missing = Object.entries(config)
      .filter(([, value]) => !value || String(value).trim() === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing PayPal webhook configuration: ${missing.join(', ')}`);
    }

    return config;
  }

  static verifyPayPalSignature_(rawBody, headers, config) {
    const token = ShopOperationsService.getPayPalAccessToken_({
      payPalApiBaseUrl: config.apiBaseUrl,
      payPalClientId: config.clientId,
      payPalSecret: config.secret
    });

    const payload = {
      auth_algo: headers['paypal-auth-algo'] || headers['PayPal-Auth-Algo'] || '',
      cert_url: headers['paypal-cert-url'] || headers['PayPal-Cert-Url'] || '',
      transmission_id: headers['paypal-transmission-id'] || headers['PayPal-Transmission-Id'] || '',
      transmission_sig: headers['paypal-transmission-sig'] || headers['PayPal-Transmission-Sig'] || '',
      transmission_time: headers['paypal-transmission-time'] || headers['PayPal-Transmission-Time'] || '',
      webhook_id: config.webhookId,
      webhook_event: this.parseJson_(rawBody, 'paypal_webhook_event')
    };

    const url = `${config.apiBaseUrl.replace(/\/$/, '')}/v1/notifications/verify-webhook-signature`;
    const response = this.httpClient.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${token}`
      },
      muteHttpExceptions: true
    });

    if (!response.success) {
      this.logger.warn('PayPal verification request failed', { statusCode: response.statusCode });
      return false;
    }

    const verification = this.parseJson_(response.content, 'paypal_verification');
    return verification?.verification_status === 'SUCCESS';
  }

  static mapStripeEventToOrder_(event) {
    const object = event?.data?.object || {};
    const amountTotal = object.amount_total || object.amount_due || object.amount || 0;
    const currency = object.currency || object.currency_code || '';

    return {
      OrderId: object.id || object.payment_intent || object.subscription || '',
      Provider: 'STRIPE',
      Status: object.payment_status || object.status || event?.type || '',
      Amount: amountTotal ? (Number(amountTotal) / 100).toFixed(2) : '',
      Currency: currency ? String(currency).toUpperCase() : '',
      CustomerEmail: object.customer_details?.email || object.customer_email || '',
      Metadata: object.metadata ? JSON.stringify(object.metadata) : '',
      LastEventType: event?.type || '',
      LastEventAt: event?.created ? new Date(event.created * 1000).toISOString() : new Date().toISOString(),
      RawEventId: event?.id || '',
      UpdatedAt: new Date().toISOString()
    };
  }

  static mapPayPalEventToOrder_(event) {
    const resource = event?.resource || {};
    const amount = resource.amount_with_breakdown?.gross_amount || resource.purchase_units?.[0]?.amount || resource.amount || {};
    const value = amount.value || amount.total || '';
    const currency = amount.currency_code || amount.currency || '';

    return {
      OrderId: resource.id || '',
      Provider: 'PAYPAL',
      Status: resource.status || event?.event_type || '',
      Amount: value ? String(value) : '',
      Currency: currency ? String(currency).toUpperCase() : '',
      CustomerEmail: resource.payer?.email_address || '',
      Metadata: resource.custom_id ? JSON.stringify({ custom_id: resource.custom_id }) : '',
      LastEventType: event?.event_type || '',
      LastEventAt: event?.create_time || new Date().toISOString(),
      RawEventId: event?.id || '',
      UpdatedAt: new Date().toISOString()
    };
  }

  static upsertOrder_(orderData) {
    const requiredHeaders = [
      'OrderId', 'Provider', 'Status', 'Amount', 'Currency',
      'CustomerEmail', 'Metadata', 'LastEventType', 'LastEventAt',
      'RawEventId', 'UpdatedAt'
    ];

    const sheet = SheetUtils.getOrCreateSheet('Orders', requiredHeaders);
    if (!sheet) {
      throw new Error('Orders sheet unavailable');
    }

    const headers = this.ensureHeaders_(sheet, requiredHeaders);
    const records = this.readSheetRecords_(sheet, headers);

    const duplicate = records.find(record => record.values.RawEventId === orderData.RawEventId);
    if (duplicate) {
      return { updated: false, duplicate: true };
    }

    const existing = records.find(record => record.values.OrderId === orderData.OrderId);

    if (existing) {
      this.writeRow_(sheet, headers, existing.rowNumber, orderData);
      return { updated: true, duplicate: false };
    }

    const newRowNumber = records.length + 2; // header + existing rows
    this.writeRow_(sheet, headers, newRowNumber, orderData);
    return { updated: true, duplicate: false };
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

  static parseStripeSignature_(header) {
    const parts = String(header || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    const result = { timestamp: '', signatures: [] };

    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key === 't') {
        result.timestamp = value;
      }
      if (key === 'v1') {
        result.signatures.push(value);
      }
    });

    if (!result.timestamp || result.signatures.length === 0) {
      throw new Error('Malformed Stripe signature header');
    }

    return result;
  }

  static computeStripeSignature_(timestamp, payload, secret) {
    const signedPayload = `${timestamp}.${payload}`;
    const signature = Utilities.computeHmacSha256Signature(signedPayload, secret);
    return signature.map(byte => (`0${(byte & 0xff).toString(16)}`).slice(-2)).join('');
  }

  static timingSafeEqual_(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  static parseJson_(content, context) {
    try {
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to parse JSON', { context, error: error.toString() });
      throw new Error(`Invalid JSON payload for ${context}`);
    }
  }
}

function handleStripeWebhook(e) {
  return PaymentWebhookService.handleStripeWebhookRequest(e);
}

function handlePayPalWebhook(e) {
  return PaymentWebhookService.handlePayPalWebhookRequest(e);
}
