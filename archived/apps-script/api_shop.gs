/**
 * @fileoverview Shop API handlers.
 */

var SHOP_ORDER_SCHEMA = {
  type: 'object',
  required: ['itemId', 'quantity', 'provider'],
  properties: {
    itemId: { type: 'string', minLength: 3 },
    quantity: { type: 'number', minimum: 1, maximum: 50 },
    purchaserId: { type: 'string', maxLength: 120 },
    notes: { type: 'string', maxLength: 250 },
    provider: { type: 'string', enum: ['stripe', 'paypal'] },
    priceId: { type: 'string', maxLength: 120 },
    successUrl: { type: 'string', maxLength: 300 },
    cancelUrl: { type: 'string', maxLength: 300 },
    amount: { type: 'number', minimum: 1 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    metadata: { type: 'object' },
    lineItems: { type: 'array', items: { type: 'object' } }
  }
};

/**
 * Handles /shop routes.
 * @param {!Object} request Request context.
 * @returns {{status:number, body:Object, pagination:?Object}}
 */
function handleShopRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'list');

  try {
    if (action === 'order') {
      return handleCreateOrder_(request);
    }

    if (action === 'product') {
      return handleFetchProduct_(request);
    }

    if (action === 'list') {
      return handleListProducts_(request);
    }

    return {
      status: 404,
      body: {
        success: false,
        message: 'Unsupported shop action: ' + action
      }
    };

  } catch (error) {
    logger.error('Shop request failed', {
      action: action,
      error: error.toString()
    });

    return {
      status: 500,
      body: {
        success: false,
        message: 'Shop service unavailable.'
      }
    };
  }
}

function handleListProducts_(request) {
  var pagination = request.pagination;
  var catalog = fetchShopCatalog({
    page: pagination.page,
    limit: pagination.perPage
  });

  return {
    status: 200,
    body: {
      success: true,
      data: catalog.products,
      meta: Object.assign({
        page: pagination.page,
        perPage: pagination.perPage
      }, catalog.pagination || {})
    },
    pagination: {
      page: pagination.page,
      perPage: pagination.perPage,
      total: catalog.pagination && catalog.pagination.total ? catalog.pagination.total : catalog.products.length,
      totalPages: catalog.pagination && catalog.pagination.totalPages ? catalog.pagination.totalPages : null
    }
  };
}

function handleFetchProduct_(request) {
  var productId = (request.pathSegments[2] || request.query.productId || '').trim();
  if (!productId) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Product ID is required.'
      }
    };
  }

  var product = fetchShopProduct(productId);

  return {
    status: 200,
    body: {
      success: true,
      data: product
    }
  };
}

function handleCreateOrder_(request) {
  var validation = validateSchema(SHOP_ORDER_SCHEMA, request.body || {});
  if (!validation.valid) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Invalid order payload.',
        errors: validation.errors
      }
    };
  }

  var payload = validation.value;

  if (payload.provider === 'stripe' && !payload.priceId) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Stripe orders require priceId.'
      }
    };
  }

  if (payload.provider === 'paypal' && (!payload.amount || !payload.currency)) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'PayPal orders require amount and currency.'
      }
    };
  }

  var checkout = createHostedCheckoutSession({
    provider: payload.provider,
    priceId: payload.priceId,
    quantity: payload.quantity,
    successUrl: payload.successUrl,
    cancelUrl: payload.cancelUrl,
    customerEmail: payload.purchaserId,
    metadata: Object.assign({}, payload.metadata || {}, { itemId: payload.itemId, notes: payload.notes }),
    notes: payload.notes,
    amount: payload.amount,
    currency: payload.currency,
    lineItems: payload.lineItems
  });

  return {
    status: 201,
    body: {
      success: true,
      checkout: checkout
    }
  };
}
