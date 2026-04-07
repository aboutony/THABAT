/**
 * validation.ts — Zod v4 schemas for all API route inputs
 *
 * Single source of truth for request validation.
 * Every API route parses its input through one of these schemas
 * before touching business logic or the database.
 *
 * Zod v4 API:
 *  - z.email() instead of z.string().email()   (deprecated in v4)
 *  - .refine(Number.isFinite) instead of .finite() (deprecated in v4)
 *  - result.error.issues instead of result.error.errors
 *
 * Phase 1.2 — Security Hardening
 */

import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
    email: z.email('Invalid email address').max(254, 'Email too long').toLowerCase(),
    password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

export const SignupSchema = z.object({
    email: z.email('Invalid email address').max(254, 'Email too long'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
    fullName: z.string().min(1, 'Full name is required').max(100, 'Full name too long').trim(),
    orgName: z.string().min(1, 'Organisation name is required').max(200, 'Organisation name too long').trim(),
    industry: z.string().max(100).optional(),
    revenueBand: z.string().max(50).optional(),
    growthStage: z.string().max(50).optional(),
});

export const PreferencePatchSchema = z.object({
    languagePreference: z.enum(['en', 'ar']).optional(),
    themePreference: z.enum(['dark', 'light']).optional(),
}).refine(
    (d) => d.languagePreference !== undefined || d.themePreference !== undefined,
    { message: 'At least one preference must be provided' }
);

// ─── Metrics ──────────────────────────────────────────────────────────────────

const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const FiniteNumber = z
    .number()
    .refine(Number.isFinite, 'Must be a finite number');

export const MetricsPostSchema = z.object({
    date: ISODate,
    cash: FiniteNumber.refine((n) => n >= 0, 'Cash cannot be negative'),
    revenue: FiniteNumber.refine((n) => n >= 0, 'Revenue cannot be negative'),
    expenses: FiniteNumber.refine((n) => n >= 0, 'Expenses cannot be negative'),
    receivables: FiniteNumber.refine((n) => n >= 0, 'Receivables cannot be negative'),
    payables: FiniteNumber.refine((n) => n >= 0, 'Payables cannot be negative'),
});

// ─── Integrations ─────────────────────────────────────────────────────────────

export const ERP_PROVIDERS = ['sap', 'odoo', 'dynamics'] as const;
export type ERPProviderValue = typeof ERP_PROVIDERS[number];

export const IntegrationsPostSchema = z.object({
    provider: z.enum(ERP_PROVIDERS),
    credentials: z
        .record(z.string(), z.string())
        .refine((c) => Object.keys(c).length > 0, 'Credentials cannot be empty'),
});

export const IntegrationsPutSchema = z.object({
    provider: z.enum(ERP_PROVIDERS),
    fromDate: ISODate.optional(),
    toDate: ISODate.optional(),
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const SwitchOrgSchema = z.object({
    orgId: z.string().min(1, 'orgId cannot be empty').max(64, 'orgId too long'),
});

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Parse and validate a request body against a Zod schema.
 *
 * Returns a discriminated union on `ok`:
 *   { ok: true,  data: T }
 *   { ok: false, error: string, status: number }
 *
 * Usage:
 *   const parsed = await parseBody(request, MySchema);
 *   if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
 *   const { field } = parsed.data;
 */
export async function parseBody<T>(
    request: Request,
    schema: z.ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: 400 | 422 }> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return { ok: false, error: 'Invalid JSON body', status: 400 };
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        const message = result.error.issues
            .map((e) => `${e.path.length ? e.path.join('.') + ': ' : ''}${e.message}`)
            .join('; ');
        return { ok: false, error: message, status: 422 };
    }

    return { ok: true, data: result.data };
}
