import type { Env } from '../env';
import { ok } from '../utils/response';

/**
 * Audit Service
 *
 * Tracks role changes and other sensitive operations
 * for security and compliance purposes.
 */

interface RoleChangeAudit {
  id: string;
  tenant: string;
  userId: string;
  userName: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
  changedByName: string;
  reason?: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a role change
 */
export const logRoleChange = async (req: any, env: Env) => {
  const { userId, userName, oldRole, newRole, reason } = req.json || {};

  if (!userId || !oldRole || !newRole) {
    return new Response(
      JSON.stringify({ error: 'userId, oldRole, and newRole are required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // Get changed by info from auth token (mock for now)
  const changedBy = req.headers.get('x-user-id') || 'system';
  const changedByName = req.headers.get('x-user-name') || 'System';

  const auditEntry: RoleChangeAudit = {
    id: crypto.randomUUID(),
    tenant: req.tenant,
    userId,
    userName: userName || 'Unknown',
    oldRole,
    newRole,
    changedBy,
    changedByName,
    reason,
    timestamp: Date.now(),
    ipAddress: req.headers.get('cf-connecting-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  };

  // Store in KV with expiration (keep for 90 days)
  const key = `audit:role-change:${req.tenant}:${auditEntry.id}`;
  await env.KV.put(
    key,
    JSON.stringify(auditEntry),
    { expirationTtl: 60 * 60 * 24 * 90 } // 90 days
  );

  // Also store in index for querying
  const indexKey = `audit:role-change:${req.tenant}:index`;
  const existingIndex = await env.KV.get(indexKey, 'json') as string[] | null;
  const index = existingIndex || [];
  index.unshift(auditEntry.id); // Add to beginning

  // Keep only last 1000 entries in index
  if (index.length > 1000) {
    index.splice(1000);
  }

  await env.KV.put(indexKey, JSON.stringify(index), { expirationTtl: 60 * 60 * 24 * 90 });

  return ok({ success: true, auditId: auditEntry.id });
};

/**
 * Get role change history
 */
export const getRoleChangeHistory = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const userId = url.searchParams.get('userId'); // Optional filter by user

  // Get index
  const indexKey = `audit:role-change:${req.tenant}:index`;
  const index = await env.KV.get(indexKey, 'json') as string[] | null;

  if (!index || index.length === 0) {
    return ok({ entries: [], total: 0 });
  }

  // Paginate index
  const paginatedIds = index.slice(offset, offset + limit);

  // Fetch entries
  const entries: RoleChangeAudit[] = [];
  for (const id of paginatedIds) {
    const key = `audit:role-change:${req.tenant}:${id}`;
    const entry = await env.KV.get(key, 'json') as RoleChangeAudit | null;

    if (entry) {
      // Filter by userId if provided
      if (!userId || entry.userId === userId) {
        entries.push(entry);
      }
    }
  }

  return ok({
    entries,
    total: index.length,
    limit,
    offset,
  });
};

/**
 * Get audit stats
 */
export const getAuditStats = async (req: any, env: Env) => {
  const indexKey = `audit:role-change:${req.tenant}:index`;
  const index = await env.KV.get(indexKey, 'json') as string[] | null;

  if (!index || index.length === 0) {
    return ok({
      totalRoleChanges: 0,
      last30Days: 0,
      last7Days: 0,
      last24Hours: 0,
    });
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let last24Hours = 0;
  let last7Days = 0;
  let last30Days = 0;

  // Count entries in each time range
  for (const id of index.slice(0, 100)) { // Check last 100 entries max
    const key = `audit:role-change:${req.tenant}:${id}`;
    const entry = await env.KV.get(key, 'json') as RoleChangeAudit | null;

    if (entry) {
      const age = now - entry.timestamp;

      if (age < day) {
        last24Hours++;
        last7Days++;
        last30Days++;
      } else if (age < 7 * day) {
        last7Days++;
        last30Days++;
      } else if (age < 30 * day) {
        last30Days++;
      }
    }
  }

  return ok({
    totalRoleChanges: index.length,
    last30Days,
    last7Days,
    last24Hours,
  });
};

/**
 * Delete old audit entries (cleanup)
 */
export const cleanupAuditEntries = async (env: Env, tenant: string) => {
  const indexKey = `audit:role-change:${tenant}:index`;
  const index = await env.KV.get(indexKey, 'json') as string[] | null;

  if (!index || index.length === 0) {
    return { deleted: 0 };
  }

  const now = Date.now();
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  const idsToDelete: string[] = [];

  // Find old entries
  for (const id of index) {
    const key = `audit:role-change:${tenant}:${id}`;
    const entry = await env.KV.get(key, 'json') as RoleChangeAudit | null;

    if (entry && (now - entry.timestamp) > maxAge) {
      idsToDelete.push(id);
      await env.KV.delete(key);
    }
  }

  // Update index
  if (idsToDelete.length > 0) {
    const newIndex = index.filter(id => !idsToDelete.includes(id));
    await env.KV.put(indexKey, JSON.stringify(newIndex), { expirationTtl: 60 * 60 * 24 * 90 });
  }

  return { deleted: idsToDelete.length };
};
