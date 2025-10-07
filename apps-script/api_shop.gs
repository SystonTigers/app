/**
 * @fileoverview Shop API handlers.
 */

var SHOP_ORDER_SCHEMA = {
  type: 'object',
  required: ['itemId', 'quantity'],
  properties: {
    itemId: { type: 'string', minLength: 3 },
    quantity: { type: 'number', minimum: 1, maximum: 50 },
    purchaserId: { type: 'string', maxLength: 120 },
    notes: { type: 'string', maxLength: 250 }
  }
};

/**
 * Handles /shop routes.
 * @param {!Object} request Request context.
 * @returns {{status:number, body:Object, pagination:?Object}}
 */
function handleShopRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'list');

  if (action === 'order') {
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
    return {
      status: 201,
      body: {
        success: true,
        order: Object.assign({ orderId: Utilities.getUuid(), status: 'received' }, validation.value)
      }
    };
  }

  if (action === 'list') {
    var pagination = request.pagination;
    return {
      status: 200,
      body: {
        success: true,
        data: [],
        meta: {
          page: pagination.page,
          perPage: pagination.perPage,
          total: 0
        }
      },
      pagination: {
        page: pagination.page,
        perPage: pagination.perPage,
        total: 0,
        totalPages: 0
      }
    };
  }

  return {
    status: 404,
    body: {
      success: false,
      message: 'Unsupported shop action: ' + action
    }
  };
}
