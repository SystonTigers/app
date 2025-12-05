# Add CSRF import after other imports (after line 8)
8 a\import { withCsrfProtection } from "../middleware/csrf";

# Fix updateTenant (line 133)
/^export async function updateTenant/,/await requireAdmin/ {
    s/await requireAdmin(req, env);/const claims = await requireAdmin(req, env);/
}

# Add CSRF check after body parsing in updateTenant  
/^export async function updateTenant/,/const data = parse/ {
    /const body = await req\.json/ {
        a\
\    // CSRF Protection\
\    await withCsrfProtection(req, env, body, claims.userId);
    }
}
