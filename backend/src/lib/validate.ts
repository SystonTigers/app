import { z } from "zod";

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
  code: string;
}

export class RequestValidationError extends Error {
  readonly status: number;
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[], status = 400) {
    super("INVALID_REQUEST");
    this.name = "RequestValidationError";
    this.status = status;
    this.issues = issues;
  }
}

export function isValidationError(error: unknown): error is RequestValidationError {
  return (
    error instanceof RequestValidationError ||
    (
      typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as RequestValidationError).issues) &&
      "status" in error
    )
  );
}

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code
    }));
    throw new RequestValidationError(issues, 400);
  }
  return result.data;
}

/**
 * Helper to create JSON responses
 */
export function json(data: any, status: number = 200, headers?: HeadersInit): Response {
  const hdrs = new Headers(headers || {});
  hdrs.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers: hdrs });
}
