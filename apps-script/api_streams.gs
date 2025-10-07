/**
 * @fileoverview Streaming API handlers.
 */

var STREAM_REGISTER_SCHEMA = {
  type: 'object',
  required: ['eventId', 'streamUrl'],
  properties: {
    eventId: { type: 'string', minLength: 6 },
    streamUrl: { type: 'string', pattern: '^(https?):\\/\\/' },
    provider: { type: 'string', maxLength: 60 }
  }
};

/**
 * Handles /streams routes.
 * @param {!Object} request Request context.
 * @returns {{status:number, body:Object, pagination:?Object}}
 */
function handleStreamsRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'list');

  if (action === 'register') {
    var validation = validateSchema(STREAM_REGISTER_SCHEMA, request.body || {});
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Invalid stream payload.',
          errors: validation.errors
        }
      };
    }
    return {
      status: 201,
      body: {
        success: true,
        stream: Object.assign({ id: Utilities.getUuid() }, validation.value)
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
      message: 'Unsupported streams action: ' + action
    }
  };
}
