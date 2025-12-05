import { json } from "../services/util";
import { logJSON } from "../lib/log";
import { trackError, trackCriticalError } from "../lib/errorTracking";

export interface AppError extends Error {
    code?: string;
    status?: number;
    details?: unknown;
}

export const errorHandler = (err: AppError, env: any, requestId: string) => {
    // If err is already a Response (e.g., from requireJWT throwing 401), return it directly
    if (err instanceof Response) {
        return err;
    }

    const status = err.status || 500;
    const code = err.code || "INTERNAL_ERROR";

    // Track error with context
    const errorContext = {
        requestId,
        code: err.code,
        statusCode: status
    };

    // Use critical tracking for 5xx errors, regular tracking for 4xx
    if (status >= 500) {
        trackCriticalError(err, errorContext);
    } else {
        trackError(err, errorContext);
    }

    // Log for backwards compatibility
    logJSON({
        level: status >= 500 ? "error" : "warn",
        requestId,
        msg: "UNHANDLED_EXCEPTION",
        error: err.message,
        stack: err.stack,
        code: err.code,
        statusCode: status
    });

    const message = status === 500 ? "Internal Server Error" : err.message;

    return json(
        {
            success: false,
            error: {
                code,
                message,
                requestId,
                details: err.details,
            },
        },
        status
    );
};

export const createResponse = (data: any, status = 200, headers?: Headers) => {
    return json(data, status, headers);
};

export const errorResponse = (code: string, message: string, status = 400, details?: any) => {
    return json({
        success: false,
        error: {
            code,
            message,
            details
        }
    }, status);
};
