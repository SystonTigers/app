/**
 * @fileoverview Authentication API handlers.
 */

/**
 * Handles authentication related routes.
 * @param {!Object} request Normalised request context.
 * @returns {{status:number, body:Object, headers:(Object|undefined)}}
 */
function handleAuthRequest(request) {
  var action = (request.pathSegments[1] || '').toLowerCase() || (request.body.action || 'verify');

  if (action === 'verify') {
    return {
      status: 200,
      body: {
        success: true,
        claims: request.user || {},
        issuedAt: new Date().toISOString()
      }
    };
  }

  if (action === 'introspect') {
    return {
      status: 200,
      body: {
        active: !!request.user,
        scope: request.user && request.user.scope ? request.user.scope : '',
        subject: request.user && request.user.sub ? request.user.sub : null,
        expiresAt: request.user && request.user.exp ? new Date(request.user.exp * 1000).toISOString() : null
      }
    };
  }

  return {
    status: 404,
    body: {
      success: false,
      message: 'Unsupported auth action: ' + action
    }
  };
}
