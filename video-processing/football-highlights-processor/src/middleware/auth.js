/**
 * JWT Authentication Middleware for Video Processing API
 * Validates tokens from the main Syston backend
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const JWT_ISSUER = process.env.JWT_ISSUER || 'syston.app';

/**
 * Middleware to verify JWT tokens
 * Extracts tenant_id from claims for multi-tenant isolation
 */
export function verifyJWT(req, res, next) {
    // Skip auth in development if explicitly disabled
    if (process.env.SKIP_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        req.tenant = { id: 'dev-tenant', roles: ['admin'] };
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authorization required',
            code: 'MISSING_TOKEN'
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            algorithms: ['HS256']
        });

        // Attach tenant info to request for downstream use
        req.tenant = {
            id: decoded.tenantId || decoded.tenant_id,
            userId: decoded.sub || decoded.userId,
            roles: decoded.roles || [],
            email: decoded.email
        };

        // Validate tenant exists
        if (!req.tenant.id) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token: missing tenant',
                code: 'INVALID_TOKEN'
            });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.tenant?.roles) {
            return res.status(403).json({
                success: false,
                error: 'No roles found',
                code: 'NO_ROLES'
            });
        }

        const hasRole = roles.some(role => req.tenant.roles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                error: `Requires one of: ${roles.join(', ')}`,
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
}

/**
 * Rate limiting configurations
 */
import rateLimit from 'express-rate-limit';

export const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour per tenant
    keyGenerator: (req) => req.tenant?.id || req.ip,
    message: {
        success: false,
        error: 'Upload rate limit exceeded. Max 10 uploads per hour.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const statusRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 status checks per minute
    message: {
        success: false,
        error: 'Too many status checks. Try again in a minute.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 min
    message: {
        success: false,
        error: 'API rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
