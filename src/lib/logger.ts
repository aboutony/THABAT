/**
 * THABAT Structured Logger — Phase 1.6
 *
 * Outputs machine-readable JSON in production (compatible with Vercel
 * log drains, Datadog, etc.) and human-readable lines in development.
 *
 * Usage:
 *   logger.info('Metrics ingested', { orgId, date });
 *   logger.warn('Demo data in production', { fn: 'getEntitySupplyChain' });
 *   logger.error('Login failed', { error, route: '/api/auth/login' });
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    error?: unknown;
    orgId?: string;
    userId?: string;
    route?: string;
    [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === 'production';

function serializeError(error: unknown): Record<string, unknown> | string {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            ...(isProd ? {} : { stack: error.stack }),
        };
    }
    return String(error);
}

function buildEntry(level: Level, message: string, context?: LogContext) {
    const { error, ...rest } = context ?? {};
    return {
        ts: new Date().toISOString(),
        level,
        message,
        ...(error !== undefined ? { error: serializeError(error) } : {}),
        ...rest,
    };
}

function emit(level: Level, message: string, context?: LogContext) {
    if (isProd) {
        // Structured JSON for log aggregation
        const fn = level === 'error' ? console.error
                 : level === 'warn'  ? console.warn
                 : console.log;
        fn(JSON.stringify(buildEntry(level, message, context)));
    } else {
        // Human-readable for local development
        const tag = `[THABAT:${level.toUpperCase()}]`;
        const { error, ...rest } = context ?? {};
        const extras = Object.keys(rest).length > 0 ? rest : undefined;

        if (level === 'error') {
            console.error(tag, message, ...(error ? [error] : []), ...(extras ? [extras] : []));
        } else if (level === 'warn') {
            console.warn(tag, message, ...(extras ? [extras] : []));
        } else {
            console.log(tag, message, ...(extras ? [extras] : []));
        }
    }
}

export const logger = {
    debug: (message: string, context?: LogContext) => emit('debug', message, context),
    info:  (message: string, context?: LogContext) => emit('info',  message, context),
    warn:  (message: string, context?: LogContext) => emit('warn',  message, context),
    error: (message: string, context?: LogContext) => emit('error', message, context),
} as const;
