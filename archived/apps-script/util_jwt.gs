/**
 * @fileoverview JWT utilities for verifying bearer tokens.
 */

/**
 * Extracts and validates a bearer token from the Authorization header.
 * @param {string} authHeader Authorization header value.
 * @returns {{valid:boolean, claims:(Object|null), message:string}}
 */
function verifyBearerJwt(authHeader) {
  if (!authHeader) {
    return { valid: false, claims: null, message: 'Missing Authorization header.' };
  }
  var parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { valid: false, claims: null, message: 'Authorization header must use Bearer scheme.' };
  }
  return verifyJwt(parts[1]);
}

/**
 * Verifies the provided JWT using the configured HS256 secret.
 * @param {string} token JWT token string.
 * @returns {{valid:boolean, claims:(Object|null), message:string}}
 */
function verifyJwt(token) {
  var config = getApiConfig();
  if (!config.jwtSecret) {
    return { valid: false, claims: null, message: 'API_JWT_SECRET is not configured.' };
  }
  if (!token) {
    return { valid: false, claims: null, message: 'Token is required.' };
  }

  var segments = token.split('.');
  if (segments.length !== 3) {
    return { valid: false, claims: null, message: 'Token structure invalid.' };
  }

  try {
    var headerSegment = segments[0];
    var payloadSegment = segments[1];
    var signatureSegment = segments[2];

    var signingInput = headerSegment + '.' + payloadSegment;
    var signatureBytes = Utilities.computeHmacSha256Signature(signingInput, config.jwtSecret, Utilities.Charset.UTF_8);
    var computedSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');

    if (computedSignature !== signatureSegment) {
      return { valid: false, claims: null, message: 'Signature mismatch.' };
    }

    var payloadBytes = Utilities.base64DecodeWebSafe(payloadSegment);
    var payloadString = Utilities.newBlob(payloadBytes).getDataAsString();
    var claims = JSON.parse(payloadString);

    if (claims.exp) {
      var nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds > claims.exp) {
        return { valid: false, claims: null, message: 'Token expired.' };
      }
    }

    if (claims.nbf) {
      var nowSecondsNbf = Math.floor(Date.now() / 1000);
      if (nowSecondsNbf < claims.nbf) {
        return { valid: false, claims: null, message: 'Token not yet valid.' };
      }
    }

    return { valid: true, claims: claims, message: 'OK' };
  } catch (error) {
    return { valid: false, claims: null, message: 'Token verification failed.' };
  }
}
