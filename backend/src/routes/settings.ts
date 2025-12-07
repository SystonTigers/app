import { z } from 'zod';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';
import { getTenantConfig, putTenantConfig, ensureTenant } from '../services/tenantConfig';

const FixtureSettingsSchema = z.object({
    autoImport: z.boolean(),
    importSource: z.string(),
    defaultVenue: z.string().optional(),
    notifyOnNewFixture: z.boolean(),
    faSnippet: z.string().optional(), // Added FA Snippet
});

export async function handleUpdateFixtureSettings(req: Request, env: any): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ error: 'Tenant ID required' }, 400);
        }

        const body = await req.json();
        const settings = FixtureSettingsSchema.parse(body);

        const config = await ensureTenant(env, tenantId);

        // Store in a 'settings' object within config, or top-level if preferred.
        // existing config structure is: { id, flags, creds, ... }
        // Let's add specific fixture settings to 'flags' or a new 'fixtures' key if we extend the type.
        // For now, let's cast or extend. To be safe with existing types, 
        // we might need to store valid keys or update the type definition.
        // But since it is KV and likely loose in runtime, we can attach it.
        // Best practice: Update TenantConfig type in types/index.ts. 
        // For this quick fix, I will verify types first.

        // Let's store it in a new 'fixtures' property on the config object
        (config as any).fixtures = settings;

        await putTenantConfig(env, config);

        return json({ success: true, settings });

    } catch (err) {
        return json({
            error: 'Failed to update settings',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500);
    }
}

export async function handleGetFixtureSettings(req: Request, env: any): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ error: 'Tenant ID required' }, 400);
        }

        const config = await ensureTenant(env, tenantId);
        const settings = (config as any).fixtures || {
            autoImport: false,
            importSource: 'fa-fulltime',
            defaultVenue: '',
            notifyOnNewFixture: true,
            faSnippet: ''
        };

        return json(settings);

    } catch (err) {
        return json({
            error: 'Failed to fetch settings',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500);
    }
}
