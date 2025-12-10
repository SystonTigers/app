/**
 * FA Sync CRON Job
 * Automatically syncs fixtures from FA Full-Time for all tenants
 * Runs daily at 06:00 UTC
 */

import type { Env } from '../env';
import { logJSON } from '../lib/log';
import {
    scrapeWebsite,
    parseSnippet,
    syncFixturesToDB
} from '../services/fa-scraper';

interface FAConfig {
    teamPageUrl?: string;
    snippetUrl?: string;
    teamName: string;
}

/**
 * Run FA sync for all tenants with FA config
 */
export const runFASync = async (env: Env, ctx: ExecutionContext) => {
    logJSON({ level: 'info', msg: 'fa_sync_cron_started' });

    const results = {
        tenantsProcessed: 0,
        totalAdded: 0,
        totalUpdated: 0,
        errors: [] as string[]
    };

    try {
        // Find all tenants with FA config
        const tenants = await getTenantsWithFAConfig(env);

        logJSON({ level: 'info', msg: 'fa_sync_tenants_found', count: tenants.length });

        for (const { tenantId, config } of tenants) {
            try {
                const tenantResults = await syncTenantFixtures(env, tenantId, config);
                results.tenantsProcessed++;
                results.totalAdded += tenantResults.added;
                results.totalUpdated += tenantResults.updated;

                logJSON({
                    level: 'info',
                    msg: 'fa_sync_tenant_complete',
                    tenantId,
                    added: tenantResults.added,
                    updated: tenantResults.updated
                });
            } catch (error: any) {
                const errorMsg = `Tenant ${tenantId}: ${error.message}`;
                results.errors.push(errorMsg);
                logJSON({ level: 'error', msg: 'fa_sync_tenant_error', tenantId, error: error.message });
            }
        }

        logJSON({
            level: 'info',
            msg: 'fa_sync_cron_completed',
            ...results
        });

    } catch (error: any) {
        logJSON({ level: 'error', msg: 'fa_sync_cron_error', error: error.message });
    }

    return results;
};

/**
 * Get all tenants that have FA config set up
 */
async function getTenantsWithFAConfig(env: Env): Promise<Array<{ tenantId: string; config: FAConfig }>> {
    const tenants: Array<{ tenantId: string; config: FAConfig }> = [];

    try {
        // List all FA config keys
        const list = await env.KV.list({ prefix: 'fa_config:' });

        for (const key of list.keys) {
            const tenantId = key.name.replace('fa_config:', '');
            const configStr = await env.KV.get(key.name);

            if (configStr) {
                try {
                    const config = JSON.parse(configStr) as FAConfig;

                    // Only include if they have at least one URL configured
                    if (config.teamPageUrl || config.snippetUrl) {
                        tenants.push({ tenantId, config });
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }
    } catch (error: any) {
        logJSON({ level: 'error', msg: 'fa_sync_list_tenants_error', error: error.message });
    }

    return tenants;
}

/**
 * Sync fixtures for a single tenant
 */
async function syncTenantFixtures(
    env: Env,
    tenantId: string,
    config: FAConfig
): Promise<{ added: number; updated: number }> {
    let totalAdded = 0;
    let totalUpdated = 0;

    // Sync from website if configured
    if (config.teamPageUrl) {
        try {
            const fixtures = await scrapeWebsite(config.teamPageUrl, config.teamName);
            if (fixtures.length > 0) {
                const result = await syncFixturesToDB(fixtures, env, tenantId);
                totalAdded += result.added;
                totalUpdated += result.updated;
            }
        } catch (error: any) {
            logJSON({
                level: 'warn',
                msg: 'fa_sync_website_failed',
                tenantId,
                url: config.teamPageUrl,
                error: error.message
            });
        }
    }

    // Sync from snippet if configured
    if (config.snippetUrl) {
        try {
            const fixtures = await parseSnippet(config.snippetUrl, config.teamName);
            if (fixtures.length > 0) {
                const result = await syncFixturesToDB(fixtures, env, tenantId);
                totalAdded += result.added;
                totalUpdated += result.updated;
            }
        } catch (error: any) {
            logJSON({
                level: 'warn',
                msg: 'fa_sync_snippet_failed',
                tenantId,
                url: config.snippetUrl,
                error: error.message
            });
        }
    }

    return { added: totalAdded, updated: totalUpdated };
}
