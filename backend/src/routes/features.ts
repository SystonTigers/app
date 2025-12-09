import { json } from "../services/util";
import { requireJWT } from "../services/auth";

/**
 * Feature flags and configuration management
 * Allows tenants to enable/disable auto-post features and configure settings
 */

// All available feature flags with descriptions
export const FEATURE_FLAGS = {
  // Auto-content features
  auto_birthdays: {
    name: 'Birthday Posts',
    description: 'Automatically post happy birthday messages for players',
    category: 'content',
    default: true,
  },
  auto_quotes: {
    name: 'Daily Quotes',
    description: 'Post motivational quotes each morning',
    category: 'content',
    default: false,
  },
  auto_countdowns: {
    name: 'Match Day Countdowns',
    description: 'Post countdown messages before match days',
    category: 'content',
    default: true,
  },
  auto_throwback_photos: {
    name: 'Throwback Thursday Photos',
    description: 'Post old team photos every Thursday',
    category: 'content',
    default: false,
  },
  auto_on_this_day: {
    name: 'On This Day',
    description: 'Post match anniversaries daily',
    category: 'content',
    default: false,
  },
  auto_milestones: {
    name: 'Player Milestones',
    description: 'Celebrate goal/assist/appearance milestones',
    category: 'content',
    default: true,
  },
  auto_player_of_week: {
    name: 'Player of the Week',
    description: 'Recognize top performer each week',
    category: 'content',
    default: false,
  },
  auto_player_of_month: {
    name: 'Player of the Month',
    description: 'Recognize top performer each month',
    category: 'content',
    default: true,
  },
  auto_weekly_roundup: {
    name: 'Weekly Stats Roundup',
    description: 'Post weekly match stats summary every Monday',
    category: 'content',
    default: false,
  },
  auto_season_posts: {
    name: 'Season Posts',
    description: 'Auto-post season start/mid/end summaries',
    category: 'content',
    default: true,
  },

  // Notification features
  geo_notifications: {
    name: 'Geo-Aware Notifications',
    description: 'Only send match updates to users not at the venue',
    category: 'notifications',
    default: true,
  },
  push_goals: {
    name: 'Goal Notifications',
    description: 'Push notification when team scores',
    category: 'notifications',
    default: true,
  },
  push_results: {
    name: 'Result Notifications',
    description: 'Push notification at full time',
    category: 'notifications',
    default: true,
  },

  // Social features
  social_twitter: {
    name: 'Twitter/X Posting',
    description: 'Automatically post to Twitter/X',
    category: 'social',
    default: false,
  },
  social_instagram: {
    name: 'Instagram Posting',
    description: 'Automatically post to Instagram',
    category: 'social',
    default: false,
  },
  social_facebook: {
    name: 'Facebook Posting',
    description: 'Automatically post to Facebook',
    category: 'social',
    default: false,
  },
};

// GET /api/v1/features - Get all available features and current settings
export async function handleGetFeatures(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const tenant = claims.tenantId;

    // Get current tenant config
    const config: any = await env.KV.get(`team:${tenant}:config`, 'json') || {};
    const currentFeatures = config.features || {};

    // Build response with current values
    const features = Object.entries(FEATURE_FLAGS).map(([key, flag]) => ({
      key,
      ...flag,
      enabled: currentFeatures[key] !== undefined ? currentFeatures[key] : flag.default,
    }));

    // Group by category
    const grouped = features.reduce((acc: any, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {});

    return json({
      success: true,
      data: {
        features,
        grouped,
        categories: ['content', 'notifications', 'social'],
      }
    }, 200, corsHdrs);

  } catch (err) {
    console.error('Get features error:', err);
    return json({ success: false, error: "Failed to get features" }, 500, corsHdrs);
  }
}

// PATCH /api/v1/features - Update feature flags
export async function handleUpdateFeatures(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const tenant = claims.tenantId;

    // Only coaches and admins can update features
    if (!claims.roles?.includes('coach') && !claims.roles?.includes('admin')) {
      return json({ success: false, error: "Insufficient permissions" }, 403, corsHdrs);
    }

    const body = await req.json() as Record<string, boolean>;

    // Get current config
    const config: any = await env.KV.get(`team:${tenant}:config`, 'json') || {};
    const currentFeatures = config.features || {};

    // Validate and update feature flags
    const updates: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key in FEATURE_FLAGS && typeof value === 'boolean') {
        updates[key] = value;
      }
    }

    // Merge updates
    const updatedFeatures = { ...currentFeatures, ...updates };
    config.features = updatedFeatures;

    // Save back to KV
    await env.KV.put(`team:${tenant}:config`, JSON.stringify(config));

    return json({
      success: true,
      data: {
        updated: Object.keys(updates),
        features: updatedFeatures,
      }
    }, 200, corsHdrs);

  } catch (err) {
    console.error('Update features error:', err);
    return json({ success: false, error: "Failed to update features" }, 500, corsHdrs);
  }
}

// GET /api/v1/config - Get tenant configuration
export async function handleGetConfig(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const tenant = claims.tenantId;

    // Get tenant config from KV
    const config: any = await env.KV.get(`team:${tenant}:config`, 'json') || {};

    // Get tenant data from D1
    const tenantData = await env.DB.prepare(
      `SELECT t.*, tb.primary_color, tb.secondary_color, tb.badge_url
       FROM tenants t
       LEFT JOIN tenant_brand tb ON t.id = tb.tenant_id
       WHERE t.id = ?`
    ).bind(tenant).first();

    return json({
      success: true,
      data: {
        tenant: tenantData,
        config: {
          team_id: config.team_id || tenant,
          team_name: config.team_name || tenantData?.name,
          features: config.features || {},
          season_dates: config.season_dates || {
            start: '09-01',
            mid: '01-01',
            end: '05-31',
          },
          social: config.social || {},
          webhook_url: config.webhook_url,
        }
      }
    }, 200, corsHdrs);

  } catch (err) {
    console.error('Get config error:', err);
    return json({ success: false, error: "Failed to get config" }, 500, corsHdrs);
  }
}

// PATCH /api/v1/config - Update tenant configuration
export async function handleUpdateConfig(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const tenant = claims.tenantId;

    // Only coaches and admins can update config
    if (!claims.roles?.includes('coach') && !claims.roles?.includes('admin')) {
      return json({ success: false, error: "Insufficient permissions" }, 403, corsHdrs);
    }

    const body = await req.json() as any;

    // Get current config
    const config: any = await env.KV.get(`team:${tenant}:config`, 'json') || {};

    // Updatable fields
    if (body.team_name !== undefined) {
      config.team_name = body.team_name;
    }
    if (body.season_dates !== undefined) {
      config.season_dates = {
        start: body.season_dates.start || config.season_dates?.start || '09-01',
        mid: body.season_dates.mid || config.season_dates?.mid || '01-01',
        end: body.season_dates.end || config.season_dates?.end || '05-31',
      };
    }
    if (body.webhook_url !== undefined) {
      config.webhook_url = body.webhook_url;
    }
    if (body.social !== undefined) {
      config.social = {
        ...config.social,
        ...body.social,
      };
    }

    // Save back to KV
    await env.KV.put(`team:${tenant}:config`, JSON.stringify(config));

    return json({
      success: true,
      data: { config }
    }, 200, corsHdrs);

  } catch (err) {
    console.error('Update config error:', err);
    return json({ success: false, error: "Failed to update config" }, 500, corsHdrs);
  }
}

// GET /api/v1/config/branding - Get branding settings
export async function handleGetBranding(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const tenant = claims.tenantId;

    const branding = await env.DB.prepare(
      `SELECT * FROM tenant_brand WHERE tenant_id = ?`
    ).bind(tenant).first();

    return json({
      success: true,
      data: branding || {
        tenant_id: tenant,
        primary_color: '#FFD700',
        secondary_color: '#000000',
        badge_url: null,
      }
    }, 200, corsHdrs);

  } catch (err) {
    return json({ success: false, error: "Failed to get branding" }, 500, corsHdrs);
  }
}

// PATCH /api/v1/config/branding - Update branding settings
export async function handleUpdateBranding(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const tenant = claims.tenantId;

    if (!claims.roles?.includes('coach') && !claims.roles?.includes('admin')) {
      return json({ success: false, error: "Insufficient permissions" }, 403, corsHdrs);
    }

    const body = await req.json() as any;

    // Validate colors
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (body.primary_color && !colorRegex.test(body.primary_color)) {
      return json({ success: false, error: "Invalid primary color format" }, 400, corsHdrs);
    }
    if (body.secondary_color && !colorRegex.test(body.secondary_color)) {
      return json({ success: false, error: "Invalid secondary color format" }, 400, corsHdrs);
    }

    // Upsert branding
    await env.DB.prepare(`
      INSERT INTO tenant_brand (tenant_id, primary_color, secondary_color, badge_url)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        primary_color = COALESCE(excluded.primary_color, primary_color),
        secondary_color = COALESCE(excluded.secondary_color, secondary_color),
        badge_url = COALESCE(excluded.badge_url, badge_url)
    `).bind(
      tenant,
      body.primary_color || '#FFD700',
      body.secondary_color || '#000000',
      body.badge_url || null
    ).run();

    return json({ success: true }, 200, corsHdrs);

  } catch (err) {
    console.error('Update branding error:', err);
    return json({ success: false, error: "Failed to update branding" }, 500, corsHdrs);
  }
}
