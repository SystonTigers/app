/**
 * @fileoverview Event API handlers.
 */

var EVENT_CREATE_SCHEMA = {
  type: 'object',
  required: ['title', 'startTime'],
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 120 },
    startTime: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:' },
    location: { type: 'string', maxLength: 120 },
    description: { type: 'string', maxLength: 500 },
    tags: { type: 'array', items: { type: 'string', maxLength: 50 } }
  }
};

/**
 * Handles /events routes.
 * @param {!Object} request Normalised request context.
 * @returns {{status:number, body:Object, headers:?Object, pagination:?Object}}
 */
function handleEventsRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'list');

  if (action === 'create') {
    var validation = validateSchema(EVENT_CREATE_SCHEMA, request.body || {});
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Invalid event payload.',
          errors: validation.errors
        }
      };
    }
    var eventId = Utilities.getUuid();
    return {
      status: 201,
      body: {
        success: true,
        event: Object.assign({ id: eventId }, validation.value)
      }
    };
  }

  if (action === 'list') {
    var pagination = request.pagination;
    var total = 0;
    return {
      status: 200,
      body: {
        success: true,
        data: [],
        meta: {
          page: pagination.page,
          perPage: pagination.perPage,
          total: total
        }
      },
      pagination: {
        page: pagination.page,
        perPage: pagination.perPage,
        total: total,
        totalPages: total ? Math.ceil(total / pagination.perPage) : 0
      }
    };
  }

  return {
    status: 404,
    body: {
      success: false,
      message: 'Unsupported events action: ' + action
    }
  };
}
