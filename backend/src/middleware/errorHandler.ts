import { json } from "../services/util";
import { logJSON } from "../lib/log";

export interface AppError extends Error {
    code?: string;
    status?: number;
    details?: unknown;
}

export const errorHandler = (err: AppError, env: any, requestId: string) => {
    logJSON({
        level: "error",
        requestId,
        msg: "UNHANDLED_EXCEPTION",
        error: err.message,
        stack: err.stack,
        code: err.code,
    });

    const status = err.status || 500;
    const code = err.code || "INTERNAL_ERROR";
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
