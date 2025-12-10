/**
 * @fileoverview Shop operations service for Printify catalog and hosted checkout creation.
 * @version 6.3.0
 */

class ShopOperationsService {
  static get logger() {
    if (!this.loggerInstance_) {
      try {
        this.loggerInstance_ = logger.scope('ShopOperations');
      } catch (error) {
        this.loggerInstance_ = {
          enterFunction() {},
          exitFunction() {},
          info: () => {},
          warn: () => {},
          error: (message, context) => console.error(`[ShopOperations] ${message}`, context || {})
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

  static getRequiredConfig_() {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      printifyApiBaseUrl: properties.getProperty('PRINTIFY_API_BASE_URL'),
      printifyShopId: properties.getProperty('PRINTIFY_SHOP_ID'),
      printifyApiKey: properties.getProperty('PRINTIFY_API_KEY'),
      stripeApiBaseUrl: properties.getProperty('STRIPE_API_BASE_URL'),
      stripeSecretKey: properties.getProperty('STRIPE_SECRET_KEY'),
      payPalApiBaseUrl: properties.getProperty('PAYPAL_API_BASE_URL'),
      payPalClientId: properties.getProperty('PAYPAL_CLIENT_ID'),
      payPalSecret: properties.getProperty('PAYPAL_SECRET')
    };

    const missing = Object.entries(config)
      .filter(([, value]) => !value || String(value).trim() === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing payment configuration: ${missing.join(', ')}`);
    }

    return config;
  }

  static fetchCatalog(options = {}) {
    const config = this.getRequiredConfig_();
    const query = this.buildQueryString_({
      page: options.page,
      limit: options.limit
    });

    const url = `${config.printifyApiBaseUrl.replace(/\/$/, '')}/v1/shops/${encodeURIComponent(config.printifyShopId)}/products.json${query}`;

    this.logger.enterFunction('fetchCatalog', { hasQuery: query.length > 0 });

    const response = this.httpClient.fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${config.printifyApiKey}`
      },
      muteHttpExceptions: true
    });

    if (!response.success) {
      this.logger.error('Failed to fetch Printify catalog', { statusCode: response.statusCode });
      throw new Error('Unable to fetch catalog');
    }

    const payload = this.parseJson_(response.content, 'catalog');
    const products = Array.isArray(payload?.data) ? payload.data.map(product => this.mapPrintifyProduct_(product)) : [];

    this.logger.exitFunction('fetchCatalog', { productCount: products.length });

    return {
      products,
      pagination: payload?.meta || {}
    };
  }

  static fetchProduct(productId) {
    if (!productId || typeof productId !== 'string') {
      throw new Error('Product ID is required');
    }

    const config = this.getRequiredConfig_();
    const url = `${config.printifyApiBaseUrl.replace(/\/$/, '')}/v1/shops/${encodeURIComponent(config.printifyShopId)}/products/${encodeURIComponent(productId)}.json`;

    this.logger.enterFunction('fetchProduct', { productId });

    const response = this.httpClient.fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${config.printifyApiKey}`
      },
      muteHttpExceptions: true
    });

    if (!response.success) {
      this.logger.error('Failed to fetch product', { statusCode: response.statusCode });
      throw new Error('Unable to fetch product');
    }

    const payload = this.parseJson_(response.content, 'product');
    const product = this.mapPrintifyProduct_(payload);

    this.logger.exitFunction('fetchProduct', { productId });
    return product;
  }

  static createHostedCheckout(request) {
    if (!request || typeof request !== 'object') {
      throw new Error('Checkout request payload is required');
    }

    const provider = String(request.provider || '').trim().toLowerCase();
    if (!provider) {
      throw new Error('Checkout provider is required');
    }

    const config = this.getRequiredConfig_();

    switch (provider) {
      case 'stripe':
        return this.createStripeCheckout_(request, config);
      case 'paypal':
        return this.createPayPalCheckout_(request, config);
      default:
        throw new Error(`Unsupported checkout provider: ${provider}`);
    }
  }

  static createStripeCheckout_(request, config) {
    const required = ['priceId', 'quantity', 'successUrl', 'cancelUrl'];
    const missing = required.filter(key => !request[key]);
    if (missing.length > 0) {
      throw new Error(`Missing Stripe checkout fields: ${missing.join(', ')}`);
    }

    const payload = this.buildStripePayload_(request);
    const url = `${config.stripeApiBaseUrl.replace(/\/$/, '')}/v1/checkout/sessions`;

    this.logger.enterFunction('createStripeCheckout_', { hasMetadata: !!request.metadata });

    const response = this.httpClient.fetch(url, {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload,
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`
      },
      muteHttpExceptions: true
    });

    if (!response.success) {
      this.logger.error('Stripe checkout creation failed', { statusCode: response.statusCode });
      throw new Error('Failed to create Stripe checkout session');
    }

    const payloadJson = this.parseJson_(response.content, 'stripe_session');

    this.logger.exitFunction('createStripeCheckout_', { sessionId: payloadJson?.id || 'unknown' });

    return {
      provider: 'stripe',
      checkoutId: payloadJson?.id || '',
      checkoutUrl: payloadJson?.url || '',
      expiresAt: payloadJson?.expires_at ? new Date(payloadJson.expires_at * 1000).toISOString() : null
    };
  }

  static createPayPalCheckout_(request, config) {
    const required = ['amount', 'currency', 'successUrl', 'cancelUrl'];
    const missing = required.filter(key => !request[key]);
    if (missing.length > 0) {
      throw new Error(`Missing PayPal checkout fields: ${missing.join(', ')}`);
    }

    const token = this.getPayPalAccessToken_(config);
    const url = `${config.payPalApiBaseUrl.replace(/\/$/, '')}/v2/checkout/orders`;

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: String(request.currency).toUpperCase(),
            value: String(request.amount)
          },
          custom_id: request.customId || ''
        }
      ],
      application_context: {
        return_url: request.successUrl,
        cancel_url: request.cancelUrl,
        shipping_preference: request.requireShipping ? 'GET_FROM_FILE' : 'NO_SHIPPING'
      }
    };

    this.logger.enterFunction('createPayPalCheckout_', { hasCustomId: !!request.customId });

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
      this.logger.error('PayPal checkout creation failed', { statusCode: response.statusCode });
      throw new Error('Failed to create PayPal order');
    }

    const payloadJson = this.parseJson_(response.content, 'paypal_order');
    const approvalLink = Array.isArray(payloadJson?.links)
      ? payloadJson.links.find(link => link.rel === 'approve')
      : null;

    this.logger.exitFunction('createPayPalCheckout_', { orderId: payloadJson?.id || 'unknown' });

    return {
      provider: 'paypal',
      checkoutId: payloadJson?.id || '',
      checkoutUrl: approvalLink?.href || '',
      status: payloadJson?.status || ''
    };
  }

  static getPayPalAccessToken_(config) {
    const url = `${config.payPalApiBaseUrl.replace(/\/$/, '')}/v1/oauth2/token`;
    const credentials = `${config.payPalClientId}:${config.payPalSecret}`;
    const encoded = Utilities.base64Encode(credentials);

    const response = this.httpClient.fetch(url, {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${encoded}`
      },
      muteHttpExceptions: true
    });

    if (!response.success) {
      this.logger.error('Failed to obtain PayPal token', { statusCode: response.statusCode });
      throw new Error('Unable to authenticate with PayPal');
    }

    const payloadJson = this.parseJson_(response.content, 'paypal_token');

    if (!payloadJson?.access_token) {
      throw new Error('PayPal token missing in response');
    }

    return payloadJson.access_token;
  }

  static buildStripePayload_(request) {
    const segments = [];

    segments.push(`mode=${encodeURIComponent(request.mode || 'payment')}`);
    segments.push(`line_items[0][price]=${encodeURIComponent(request.priceId)}`);
    segments.push(`line_items[0][quantity]=${encodeURIComponent(String(request.quantity))}`);
    segments.push(`success_url=${encodeURIComponent(request.successUrl)}`);
    segments.push(`cancel_url=${encodeURIComponent(request.cancelUrl)}`);

    if (request.customerEmail) {
      segments.push(`customer_email=${encodeURIComponent(String(request.customerEmail))}`);
    }

    if (request.metadata && typeof request.metadata === 'object') {
      const sanitized = this.sanitizeMetadata_(request.metadata);
      Object.keys(sanitized).forEach(key => {
        segments.push(`metadata[${encodeURIComponent(key)}]=${encodeURIComponent(String(sanitized[key]))}`);
      });
    }

    if (Array.isArray(request.lineItems)) {
      request.lineItems.forEach((item, index) => {
        if (item && item.priceId && item.quantity) {
          const idx = index + 1; // start at 1 for additional items
          segments.push(`line_items[${idx}][price]=${encodeURIComponent(item.priceId)}`);
          segments.push(`line_items[${idx}][quantity]=${encodeURIComponent(String(item.quantity))}`);
        }
      });
    }

    return segments.join('&');
  }

  static sanitizeMetadata_(metadata) {
    const sanitized = {};
    Object.keys(metadata).forEach(key => {
      if (typeof metadata[key] === 'string' || typeof metadata[key] === 'number' || typeof metadata[key] === 'boolean') {
        sanitized[key.replace(/[^a-zA-Z0-9_\-]/g, '_')] = metadata[key];
      }
    });
    return sanitized;
  }

  static buildQueryString_(params = {}) {
    const entries = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

    if (entries.length === 0) {
      return '';
    }

    const query = entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    return `?${query}`;
  }

  static parseJson_(content, context) {
    try {
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to parse JSON', { context, error: error.toString() });
      throw new Error(`Invalid JSON response for ${context}`);
    }
  }

  static mapPrintifyProduct_(product) {
    if (!product || typeof product !== 'object') {
      return {};
    }

    const variants = Array.isArray(product.variants)
      ? product.variants.map(variant => ({
        id: variant?.id || '',
        sku: variant?.sku || '',
        price: variant?.price || '',
        is_enabled: !!variant?.is_enabled,
        is_default: !!variant?.is_default
      }))
      : [];

    const images = Array.isArray(product.images)
      ? product.images.map(image => ({
        src: image?.src || '',
        is_default: !!image?.is_default,
        position: image?.position || 0
      }))
      : [];

    return {
      id: product.id || '',
      title: product.title || '',
      description: product.description || '',
      tags: Array.isArray(product.tags) ? product.tags.slice(0, 10) : [],
      options: Array.isArray(product.options) ? product.options.map(option => ({
        name: option?.name || '',
        type: option?.type || '',
        values: Array.isArray(option?.values) ? option.values.slice(0, 20) : []
      })) : [],
      variants,
      images,
      is_published: !!product.is_published
    };
  }
}

function fetchShopCatalog(options) {
  return ShopOperationsService.fetchCatalog(options || {});
}

function fetchShopProduct(productId) {
  return ShopOperationsService.fetchProduct(productId);
}

function createHostedCheckoutSession(request) {
  return ShopOperationsService.createHostedCheckout(request);
}
