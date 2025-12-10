/**
 * @fileoverview Subscription API handlers.
 */

var SUBSCRIPTION_CREATE_SCHEMA = {
  type: 'object',
  required: ['memberId', 'planId'],
  properties: {
    memberId: { type: 'string', minLength: 3 },
    planId: { type: 'string', minLength: 3 },
    startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    autoRenew: { type: 'boolean' }
  }
};

/**
 * Handles /subs routes.
 * @param {!Object} request Request context.
 * @returns {{status:number, body:Object, pagination:?Object}}
 */
function handleSubsRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'list');

  if (action === 'create') {
    var validation = validateSchema(SUBSCRIPTION_CREATE_SCHEMA, request.body || {});
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Invalid subscription payload.',
          errors: validation.errors
        }
      };
    }
    return {
      status: 201,
      body: {
        success: true,
        subscription: Object.assign({ subscriptionId: Utilities.getUuid() }, validation.value)
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
      message: 'Unsupported subs action: ' + action
    }
  };
}
