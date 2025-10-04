// src/services/googleAuth.ts

/**
 * Google Service Account Authentication
 * Signs JWTs using RS256 for Google API authentication
 */

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface JWTClaims {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * Google OAuth token response
 */
interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Sign JWT using RS256 with service account private key
 */
export async function signJWT(claims: JWTClaims, privateKey: string): Promise<string> {
  // Prepare header
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  // Base64URL encode header and claims
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  // Import private key for signing
  const cryptoKey = await importPrivateKey(privateKey);

  // Sign the JWT
  const encoder = new TextEncoder();
  const data = encoder.encode(signingInput);
  const signature = await crypto.subtle.sign(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    cryptoKey,
    data
  );

  // Encode signature
  const encodedSignature = base64UrlEncode(signature);

  // Return complete JWT
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Import PEM-formatted RSA private key
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // Decode base64 to binary
  const binaryDer = atob(pemContents);
  const keyData = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    keyData[i] = binaryDer.charCodeAt(i);
  }

  // Import as CryptoKey
  return await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
}

/**
 * Base64URL encode (RFC 4648)
 */
function base64UrlEncode(input: string | ArrayBuffer): string {
  let base64: string;

  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    const bytes = new Uint8Array(input);
    const binary = Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join('');
    base64 = btoa(binary);
  }

  // Convert to base64url
  return base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Get OAuth2 access token from service account
 */
export async function getAccessToken(
  serviceAccountKey: ServiceAccountKey,
  scopes: string[]
): Promise<TokenResponse> {
  const now = Math.floor(Date.now() / 1000);

  // Build JWT claims
  const claims: JWTClaims = {
    iss: serviceAccountKey.client_email,
    scope: scopes.join(' '),
    aud: serviceAccountKey.token_uri,
    exp: now + 3600, // 1 hour
    iat: now
  };

  // Sign JWT
  const jwt = await signJWT(claims, serviceAccountKey.private_key);

  // Exchange JWT for access token
  const response = await fetch(serviceAccountKey.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  return await response.json() as TokenResponse;
}

/**
 * Parse service account key from base64-encoded JSON
 */
export function parseServiceAccountKey(base64Key: string): ServiceAccountKey {
  try {
    const jsonString = atob(base64Key);
    return JSON.parse(jsonString) as ServiceAccountKey;
  } catch (error) {
    throw new Error(`Failed to parse service account key: ${error}`);
  }
}

/**
 * Get authenticated headers for Google API requests
 */
export async function getGoogleAPIHeaders(
  serviceAccountKeyBase64: string,
  scopes: string[]
): Promise<Record<string, string>> {
  const serviceAccountKey = parseServiceAccountKey(serviceAccountKeyBase64);
  const tokenResponse = await getAccessToken(serviceAccountKey, scopes);

  return {
    'Authorization': `Bearer ${tokenResponse.access_token}`,
    'Content-Type': 'application/json'
  };
}
