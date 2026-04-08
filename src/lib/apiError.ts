/**
 * apiError — Phase 1.4.3
 *
 * Single source of truth for API error responses.
 *
 * Guarantees:
 *   • Consistent JSON shape: { error: string, code?: string }
 *   • Correct HTTP status semantics for every error type
 *   • No stack traces or internal details exposed to clients
 *   • Named factory functions that make intent explicit at call sites
 *
 * Usage:
 *   return apiError.unauthorized();
 *   return apiError.forbidden();
 *   return apiError.notFound('User not found');
 *   return apiError.validation('email: Invalid email address');
 *   return apiError.conflict('Email already registered');
 *   return apiError.tooManyRequests(retryAfterSeconds);
 *   return apiError.internal(error);          // logs, returns generic message
 *   return apiError.badRequest('group parameter required');
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export type ApiErrorBody = {
    error: string;
    code?: string;
};

function make(status: number, message: string, code?: string): NextResponse<ApiErrorBody> {
    const body: ApiErrorBody = { error: message };
    if (code) body.code = code;
    return NextResponse.json(body, { status });
}

export const apiError = {
    /** 400 — malformed request (missing params, wrong format) */
    badRequest(message = 'Bad request'): NextResponse<ApiErrorBody> {
        return make(400, message, 'BAD_REQUEST');
    },

    /** 401 — missing or invalid authentication */
    unauthorized(message = 'Unauthorized'): NextResponse<ApiErrorBody> {
        return make(401, message, 'UNAUTHORIZED');
    },

    /** 403 — authenticated but not permitted */
    forbidden(message = 'Forbidden'): NextResponse<ApiErrorBody> {
        return make(403, message, 'FORBIDDEN');
    },

    /** 404 — resource not found */
    notFound(message = 'Not found'): NextResponse<ApiErrorBody> {
        return make(404, message, 'NOT_FOUND');
    },

    /** 409 — state conflict (e.g. duplicate email) */
    conflict(message = 'Conflict'): NextResponse<ApiErrorBody> {
        return make(409, message, 'CONFLICT');
    },

    /**
     * 422 — validation failure (Zod schema rejection).
     * Passes the Zod-generated message directly — it is already sanitized
     * (field paths + constraint messages, no internal stack information).
     */
    validation(message: string): NextResponse<ApiErrorBody> {
        return make(422, message, 'VALIDATION_ERROR');
    },

    /**
     * 429 — rate limit exceeded.
     * Adds Retry-After header so clients can back off correctly.
     */
    tooManyRequests(retryAfterSeconds: number): NextResponse<ApiErrorBody> {
        const res = make(429, 'Too many requests — please slow down', 'RATE_LIMITED');
        res.headers.set('Retry-After', String(retryAfterSeconds));
        return res;
    },

    /**
     * 500 — unexpected server error.
     * Logs the real error server-side; returns a generic message to clients.
     * Accepts Error | unknown so callers don't need to cast.
     */
    internal(error: unknown, context = 'API error'): NextResponse<ApiErrorBody> {
        logger.error(context, { error });
        return make(500, 'Internal server error', 'INTERNAL_ERROR');
    },
} as const;
