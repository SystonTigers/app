import { verifyJWT } from "../routes/auth";
import { json } from "../services/util";

/**
 * User roles and their hierarchy
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<string, number> = {
    'fan': 1,
    'player': 2,
    'parent': 3,
    'coach': 4,
    'manager': 5,
    'tenant_admin': 6,
    'platform_admin': 10,
};

/**
 * Permission definitions matching shared/sdk permissions.ts
 */
interface Permission {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
}

const ROLE_PERMISSIONS: Record<string, Record<string, Permission>> = {
    manager: {
        squad: { view: true, create: true, edit: true, delete: true },
        fixtures: { view: true, create: true, edit: true, delete: true },
        training: { view: true, create: true, edit: true, delete: true },
        tactics: { view: true, create: true, edit: true, delete: true },
        discussions: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, edit: true },
        admin: { view: true, edit: true },
    },
    coach: {
        squad: { view: true, create: true, edit: true, delete: false },
        fixtures: { view: true, create: true, edit: true, delete: false },
        training: { view: true, create: true, edit: true, delete: true },
        tactics: { view: true, create: true, edit: true, delete: true },
        discussions: { view: true, create: true, edit: false, delete: false },
        settings: { view: true, edit: false },
        admin: { view: false, edit: false },
    },
    parent: {
        squad: { view: true, create: false, edit: false, delete: false },
        fixtures: { view: true, create: false, edit: false, delete: false },
        training: { view: true, create: false, edit: false, delete: false },
        tactics: { view: false },
        discussions: { view: true, create: true, edit: false, delete: false },
        settings: { view: false, edit: false },
        admin: { view: false, edit: false },
    },
    player: {
        squad: { view: true, create: false, edit: false, delete: false },
        fixtures: { view: true, create: false, edit: false, delete: false },
        training: { view: true, create: false, edit: false, delete: false },
        tactics: { view: true },
        discussions: { view: true, create: true, edit: false, delete: false },
        settings: { view: false, edit: false },
        admin: { view: false, edit: false },
    },
    fan: {
        squad: { view: true, create: false, edit: false, delete: false },
        fixtures: { view: true, create: false, edit: false, delete: false },
        training: { view: false },
        tactics: { view: false },
        discussions: { view: false },
        settings: { view: false, edit: false },
        admin: { view: false, edit: false },
    },
};

/**
 * Check if a role has permission for an action on a resource
 */
export function canAccess(
    role: string,
    resource: string,
    action: 'view' | 'create' | 'edit' | 'delete' = 'view'
): boolean {
    // Manager/admin always has access
    if (role === 'manager' || role === 'tenant_admin' || role === 'platform_admin') {
        return true;
    }

    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {return false;}

    const resourcePerm = permissions[resource];
    if (!resourcePerm) {return false;}

    return resourcePerm[action] === true;
}

/**
 * Get session claims from request
 * Returns null if no valid session
 */
export async function getSessionFromRequest(
    req: Request,
    env: any
): Promise<{ role: string; tenantId: string; playerId?: string } | null> {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        const payload = await verifyJWT(env, token);

        if (!payload) {return null;}

        return {
            role: payload.role || 'fan',
            tenantId: payload.tenant_id || payload.tenantId,
            playerId: payload.player_id,
        };
    } catch {
        return null;
    }
}

/**
 * Middleware to require a minimum role level
 */
export function requireRole(minRole: string) {
    return async (req: Request, env: any, corsHdrs: Headers): Promise<Response | null> => {
        const session = await getSessionFromRequest(req, env);

        if (!session) {
            return json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            }, 401, corsHdrs);
        }

        const userLevel = ROLE_HIERARCHY[session.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userLevel < requiredLevel) {
            return json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
            }, 403, corsHdrs);
        }

        return null; // Permission granted, continue to handler
    };
}

/**
 * Middleware to require specific permission on a resource
 */
export function requirePermission(resource: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view') {
    return async (req: Request, env: any, corsHdrs: Headers): Promise<Response | null> => {
        const session = await getSessionFromRequest(req, env);

        if (!session) {
            return json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            }, 401, corsHdrs);
        }

        if (!canAccess(session.role, resource, action)) {
            return json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `Permission denied: ${action} on ${resource}`
                }
            }, 403, corsHdrs);
        }

        return null; // Permission granted
    };
}

/**
 * Wrapper to protect a route handler with role check
 */
export function withRole<T extends any[]>(
    minRole: string,
    handler: (req: Request, env: any, corsHdrs: Headers, ...args: T) => Promise<Response>
) {
    return async (req: Request, env: any, corsHdrs: Headers, ...args: T): Promise<Response> => {
        const check = await requireRole(minRole)(req, env, corsHdrs);
        if (check) {return check;}
        return handler(req, env, corsHdrs, ...args);
    };
}

/**
 * Wrapper to protect a route handler with permission check
 */
export function withPermission<T extends any[]>(
    resource: string,
    action: 'view' | 'create' | 'edit' | 'delete',
    handler: (req: Request, env: any, corsHdrs: Headers, ...args: T) => Promise<Response>
) {
    return async (req: Request, env: any, corsHdrs: Headers, ...args: T): Promise<Response> => {
        const check = await requirePermission(resource, action)(req, env, corsHdrs);
        if (check) {return check;}
        return handler(req, env, corsHdrs, ...args);
    };
}
