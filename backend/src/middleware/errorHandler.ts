import { json } from "../services/util";
import { logJSON } from "../lib/log";

export interface AppError extends Error {
    code?: string;
    status?: number;
    details?: unknown;
}

export const errorHandler = (err: AppError, env: any, requestId: string) => {
    logJSON("error", requestId, {
        message: "UNHANDLED_EXCEPTION",
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
