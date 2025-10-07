/**
 * @fileoverview Attendance API handlers.
 */

var ATTENDANCE_MARK_SCHEMA = {
  type: 'object',
  required: ['eventId', 'playerId', 'status'],
  properties: {
    eventId: { type: 'string', minLength: 8 },
    playerId: { type: 'string', minLength: 3 },
    status: { type: 'string', enum: ['confirmed', 'declined', 'tentative'] },
    note: { type: 'string', maxLength: 250 }
  }
};

/**
 * Handles /attendance routes.
 * @param {!Object} request Request context.
 * @returns {{status:number, body:Object, pagination:?Object}}
 */
function handleAttendanceRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'list');

  if (action === 'mark') {
    var validation = validateSchema(ATTENDANCE_MARK_SCHEMA, request.body || {});
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'Invalid attendance payload.',
          errors: validation.errors
        }
      };
    }
    return {
      status: 200,
      body: {
        success: true,
        attendance: Object.assign({ recordedAt: new Date().toISOString() }, validation.value)
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
      message: 'Unsupported attendance action: ' + action
    }
  };
}
