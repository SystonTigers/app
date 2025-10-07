/**
 * @fileoverview Voting API handlers.
 */

var VOTE_SUBMIT_SCHEMA = {
  type: 'object',
  required: ['pollId', 'selection'],
  properties: {
    pollId: { type: 'string', minLength: 6 },
    selection: { type: 'string', minLength: 1, maxLength: 120 },
    voterId: { type: 'string', maxLength: 120 }
  }
};

/**
 * Handles /votes routes.
 * @param {!Object} request Request context.
 * @returns {{status:number, body:Object, pagination:?Object}}
 */
function handleVotesRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'results');

  if (action === 'submit') {
    var validation = validateSchema(VOTE_SUBMIT_SCHEMA, request.body || {});
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Invalid vote payload.',
          errors: validation.errors
        }
      };
    }
    return {
      status: 202,
      body: {
        success: true,
        received: validation.value,
        recordedAt: new Date().toISOString()
      }
    };
  }

  if (action === 'results') {
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
      message: 'Unsupported votes action: ' + action
    }
  };
}
