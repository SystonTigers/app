/**
 * FA Sync Routes
 * API endpoints for syncing fixtures from FA Full-Time
 */

import { json } from '../services/util';
import { requireJWT } from '../services/auth';
import {
    scrapeWebsite,
    parseSnippet,
    parseEmailContent,
    syncFixturesToDB,
    FAFixture
} from '../services/fa-scraper';

// ====== TYPES ======

interface FAConfig {
    teamPageUrl?: string;
    snippetUrl?: string;
    teamName: string;
}

// ====== SYNC FROM WEBSITE ======

export async function handleSyncFromWebsite(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);

        // Get request body
        const body = await req.json() as { teamPageUrl?: string; teamName?: string };

        // Get FA config from tenant settings or request
        const faConfig = await getFAConfig(env, claims.tenantId!);
        const teamPageUrl = body.teamPageUrl || faConfig.teamPageUrl;
        const teamName = body.teamName || faConfig.teamName;

        if (!teamPageUrl) {
            return json({
                success: false,
                error: 'No FA team page URL configured. Please provide teamPageUrl in request or configure in tenant settings.'
            }, 400, corsHdrs);
        }

        // Scrape fixtures from website
        const fixtures = await scrapeWebsite(teamPageUrl, teamName);

        if (fixtures.length === 0) {
            return json({
                success: true,
                message: 'No fixtures found on FA website',
                fixtures: [],
                synced: { added: 0, updated: 0 }
            }, 200, corsHdrs);
        }

        // Sync to database
        const syncResult = await syncFixturesToDB(fixtures, env, claims.tenantId!);

        return json({
            success: true,
            message: `Synced ${syncResult.added} new, ${syncResult.updated} updated fixtures from FA website`,
            fixtures,
            synced: syncResult
        }, 200, corsHdrs);

    } catch (error: any) {
        console.error('FA website sync error:', error);
        return json({
            success: false,
            error: error.message || 'Failed to sync from FA website'
        }, 500, corsHdrs);
    }
}

// ====== SYNC FROM SNIPPET ======

export async function handleSyncFromSnippet(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);

        const body = await req.json() as { snippetUrl?: string; teamName?: string };

        const faConfig = await getFAConfig(env, claims.tenantId!);
        const snippetUrl = body.snippetUrl || faConfig.snippetUrl;
        const teamName = body.teamName || faConfig.teamName;

        if (!snippetUrl) {
            return json({
                success: false,
                error: 'No FA snippet URL configured. Please provide snippetUrl in request or configure in tenant settings.'
            }, 400, corsHdrs);
        }

        // Parse fixtures from snippet
        const fixtures = await parseSnippet(snippetUrl, teamName);

        if (fixtures.length === 0) {
            return json({
                success: true,
                message: 'No fixtures found in FA snippet',
                fixtures: [],
                synced: { added: 0, updated: 0 }
            }, 200, corsHdrs);
        }

        // Sync to database
        const syncResult = await syncFixturesToDB(fixtures, env, claims.tenantId!);

        return json({
            success: true,
            message: `Synced ${syncResult.added} new, ${syncResult.updated} updated fixtures from FA snippet`,
            fixtures,
            synced: syncResult
        }, 200, corsHdrs);

    } catch (error: any) {
        console.error('FA snippet sync error:', error);
        return json({
            success: false,
            error: error.message || 'Failed to sync from FA snippet'
        }, 500, corsHdrs);
    }
}

// ====== PARSE EMAIL CONTENT (Manual Paste) ======

export async function handleParseEmail(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);

        const body = await req.json() as { emailContent: string; teamName?: string };

        if (!body.emailContent) {
            return json({
                success: false,
                error: 'emailContent is required. Paste the FA fixture email HTML or text.'
            }, 400, corsHdrs);
        }

        const faConfig = await getFAConfig(env, claims.tenantId!);
        const teamName = body.teamName || faConfig.teamName;

        // Parse fixtures from email content
        const fixtures = parseEmailContent(body.emailContent, teamName);

        if (fixtures.length === 0) {
            return json({
                success: false,
                error: 'Could not extract fixture data from email content. Please check the format.'
            }, 400, corsHdrs);
        }

        // Sync to database
        const syncResult = await syncFixturesToDB(fixtures, env, claims.tenantId!);

        return json({
            success: true,
            message: `Parsed and synced ${syncResult.added} new, ${syncResult.updated} updated fixtures from email`,
            fixtures,
            synced: syncResult
        }, 200, corsHdrs);

    } catch (error: any) {
        console.error('FA email parse error:', error);
        return json({
            success: false,
            error: error.message || 'Failed to parse email content'
        }, 500, corsHdrs);
    }
}

// ====== EMAIL WEBHOOK (For Cloudflare Email Workers) ======

export async function handleEmailWebhook(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        // This endpoint can be called by Cloudflare Email Workers
        // or any email forwarding service

        const body = await req.json() as {
            from: string;
            subject: string;
            html?: string;
            text?: string;
            tenantId: string;
        };

        // Validate FA sender
        const faSenders = [
            'fa-fixtures@thefa.com',
            'fixtures@thefa.com',
            'noreply@thefa.com',
            'fulltime@thefa.com'
        ];

        const isFromFA = faSenders.some(sender =>
            body.from.toLowerCase().includes(sender)
        );

        if (!isFromFA) {
            console.log(`[FA Webhook] Ignoring email from: ${body.from}`);
            return json({ success: true, message: 'Email ignored (not from FA)' }, 200, corsHdrs);
        }

        // Get tenant config
        const faConfig = await getFAConfig(env, body.tenantId);
        const emailContent = body.html || body.text || '';

        // Parse fixtures
        const fixtures = parseEmailContent(emailContent, faConfig.teamName);

        if (fixtures.length === 0) {
            return json({
                success: true,
                message: 'No fixtures found in email'
            }, 200, corsHdrs);
        }

        // Sync to database
        const syncResult = await syncFixturesToDB(fixtures, env, body.tenantId);

        console.log(`[FA Webhook] Synced ${syncResult.added} fixtures from email`);

        return json({
            success: true,
            message: `Synced ${syncResult.added} fixtures from email`,
            synced: syncResult
        }, 200, corsHdrs);

    } catch (error: any) {
        console.error('FA email webhook error:', error);
        return json({
            success: false,
            error: error.message || 'Failed to process email webhook'
        }, 500, corsHdrs);
    }
}

// ====== SYNC ALL SOURCES ======

export async function handleSyncAll(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const faConfig = await getFAConfig(env, claims.tenantId!);

        const results = {
            website: { fixtures: 0, added: 0, updated: 0, error: null as string | null },
            snippet: { fixtures: 0, added: 0, updated: 0, error: null as string | null }
        };

        // Sync from website
        if (faConfig.teamPageUrl) {
            try {
                const fixtures = await scrapeWebsite(faConfig.teamPageUrl, faConfig.teamName);
                const syncResult = await syncFixturesToDB(fixtures, env, claims.tenantId!);
                results.website = {
                    fixtures: fixtures.length,
                    added: syncResult.added,
                    updated: syncResult.updated,
                    error: null
                };
            } catch (error: any) {
                results.website.error = error.message;
            }
        }

        // Sync from snippet
        if (faConfig.snippetUrl) {
            try {
                const fixtures = await parseSnippet(faConfig.snippetUrl, faConfig.teamName);
                const syncResult = await syncFixturesToDB(fixtures, env, claims.tenantId!);
                results.snippet = {
                    fixtures: fixtures.length,
                    added: syncResult.added,
                    updated: syncResult.updated,
                    error: null
                };
            } catch (error: any) {
                results.snippet.error = error.message;
            }
        }

        const totalAdded = results.website.added + results.snippet.added;
        const totalUpdated = results.website.updated + results.snippet.updated;

        return json({
            success: true,
            message: `Synced ${totalAdded} new, ${totalUpdated} updated fixtures from all sources`,
            results
        }, 200, corsHdrs);

    } catch (error: any) {
        console.error('FA sync all error:', error);
        return json({
            success: false,
            error: error.message || 'Failed to sync from all sources'
        }, 500, corsHdrs);
    }
}

// ====== GET/SET FA CONFIG ======

export async function handleGetFAConfig(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const config = await getFAConfig(env, claims.tenantId!);

        return json({
            success: true,
            config
        }, 200, corsHdrs);

    } catch (error: any) {
        return json({
            success: false,
            error: error.message
        }, 500, corsHdrs);
    }
}

export async function handleSetFAConfig(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as FAConfig;

        // Validate
        if (!body.teamName) {
            return json({
                success: false,
                error: 'teamName is required'
            }, 400, corsHdrs);
        }

        // Save to KV
        const configKey = `fa_config:${claims.tenantId}`;
        await env.KV.put(configKey, JSON.stringify(body));

        return json({
            success: true,
            message: 'FA configuration saved',
            config: body
        }, 200, corsHdrs);

    } catch (error: any) {
        return json({
            success: false,
            error: error.message
        }, 500, corsHdrs);
    }
}

// ====== HELPER: Get FA Config ======

async function getFAConfig(env: any, tenantId: string): Promise<FAConfig> {
    try {
        const configKey = `fa_config:${tenantId}`;
        const stored = await env.KV?.get(configKey);

        if (stored) {
            return JSON.parse(stored);
        }

        // Try to get from tenant table
        const tenant = await env.DB?.prepare(
            'SELECT name FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        return {
            teamName: tenant?.name || 'Your Football Club'
        };

    } catch {
        return {
            teamName: 'Your Football Club'
        };
    }
}
