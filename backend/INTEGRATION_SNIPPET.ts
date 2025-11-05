// INTEGRATION SNIPPET FOR src/index.ts
// Add these imports and integrate the middleware into your signup routes

// ============================================================================
// ADD THESE IMPORTS AT THE TOP
// ============================================================================

import { requireSignupEnabled } from './middleware/killswitch';
import { addSecurityHeaders, getCorsHeaders, handleCorsPreFlight } from './middleware/security-headers';

// ============================================================================
// UPDATE YOUR FETCH HANDLER
// ============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreFlight(request, env);
    }

    // Get CORS headers for this request
    const corsHeaders = getCorsHeaders(request, env);

    // ========================================================================
    // ADD KILL SWITCH CHECK BEFORE SIGNUP ROUTES
    // ========================================================================

    // Check kill switch for all signup endpoints
    if (url.pathname.startsWith('/public/signup/')) {
      const killSwitchResponse = await requireSignupEnabled(request, env, corsHeaders);
      if (killSwitchResponse) {
        // Signups are disabled, return 503
        return addSecurityHeaders(killSwitchResponse, env);
      }
    }

    // Continue with your existing route handlers...

    // POST /public/signup/start
    if (url.pathname === '/public/signup/start' && request.method === 'POST') {
      const response = await signupStart(request, env, requestId, corsHeaders);
      return addSecurityHeaders(response, env);
    }

    // POST /public/signup/brand
    if (url.pathname === '/public/signup/brand' && request.method === 'POST') {
      const response = await signupBrand(request, env, requestId, corsHeaders);
      return addSecurityHeaders(response, env);
    }

    // POST /public/signup/starter/make
    if (url.pathname === '/public/signup/starter/make' && request.method === 'POST') {
      const response = await signupStarterMake(request, env, requestId, corsHeaders);
      return addSecurityHeaders(response, env);
    }

    // POST /public/signup/pro/confirm
    if (url.pathname === '/public/signup/pro/confirm' && request.method === 'POST') {
      const response = await signupProConfirm(request, env, requestId, corsHeaders);
      return addSecurityHeaders(response, env);
    }

    // ... rest of your routes ...

    // Always wrap final response with security headers
    const finalResponse = /* your response */;
    return addSecurityHeaders(finalResponse, env);
  }
};

// ============================================================================
// WRANGLER.TOML - ADD FEATURE_FLAGS KV BINDING
// ============================================================================

/*
Add to your wrangler.toml:

[[kv_namespaces]]
binding = "FEATURE_FLAGS"
id = "your-kv-namespace-id-here"
preview_id = "your-preview-kv-namespace-id-here"

# Create the namespace:
# wrangler kv:namespace create "FEATURE_FLAGS"
# wrangler kv:namespace create "FEATURE_FLAGS" --preview
*/

// ============================================================================
// TYPES - ADD TO src/types.ts
// ============================================================================

/*
export interface Env {
  // ... existing bindings ...
  FEATURE_FLAGS: KVNamespace;  // <-- ADD THIS
  ENVIRONMENT: string; // 'production' | 'preview' | 'development'
}
*/

// ============================================================================
// EMERGENCY COMMANDS
// ============================================================================

/*
# DISABLE SIGNUPS (instant kill switch)
wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled false

# RE-ENABLE SIGNUPS
wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled true

# CHECK CURRENT STATUS
wrangler kv:key get --binding=FEATURE_FLAGS signup_enabled
*/
