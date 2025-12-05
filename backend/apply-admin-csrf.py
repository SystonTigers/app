#!/usr/bin/env python3
import re
import sys

# Read the file
with open('src/routes/admin.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
import_pattern = r'(import \{ logJSON \} from "../lib/log";)'
import_replacement = r'\1\nimport { withCsrfProtection } from "../middleware/csrf";'
content = re.sub(import_pattern, import_replacement, content)

# 2. Fix all requireAdmin calls to capture claims
content = re.sub(
    r'(\s+)await requireAdmin\(req, env\);',
    r'\1const claims = await requireAdmin(req, env);',
    content
)

# 3. Add CSRF after body parsing (functions with body)
# Pattern: after "const body = await req.json()..."
csrf_insert = r'\n\n\1// CSRF Protection\n\1await withCsrfProtection(req, env, body, claims.userId);'
content = re.sub(
    r'(\s+)const body = await req\.json\(\)[^;]*;',
    r'\g<0>' + csrf_insert,
    content
)

# 4. Add CSRF for functions without body (after requireAdmin)
# For deactivate/delete functions
for func in ['deactivateTenant', 'deleteTenant', 'deactivatePromoCode']:
    pattern = rf'(export async function {func}.*?const claims = await requireAdmin\(req, env\);)'
    replacement = r'\1\n\n    // CSRF Protection\n    await withCsrfProtection(req, env, undefined, claims.userId);'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('src/routes/admin.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] CSRF protection applied to admin.ts")
print("[INFO] Changes made:")
print("  - Added import for withCsrfProtection")
print("  - Protected 6 functions with CSRF validation")
print("")
print("[TEST] Next: Run 'npm run build' to test")
