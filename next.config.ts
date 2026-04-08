import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// ─── Environment validation ────────────────────────────────────────────────
// Fail fast at build time if required server-side variables are missing.
const REQUIRED_SERVER_VARS = ['JWT_SECRET', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];

if (process.env.NODE_ENV !== 'test') {
    for (const key of REQUIRED_SERVER_VARS) {
        if (!process.env[key]) {
            throw new Error(
                `[THABAT] Missing required environment variable: ${key}\n` +
                `Copy .env.example to .env and fill in the values.\n` +
                `See docs/environment-strategy.md for setup instructions.`
            );
        }
    }
}

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const isProd = process.env.NODE_ENV === 'production';

// ─── Content-Security-Policy ───────────────────────────────────────────────
// Allows Next.js hydration (unsafe-inline), Google Fonts, html2canvas (blob/data).
// Delivery team: tighten to nonce-based CSP after Phase 1 for maximum security.
const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",                   // Next.js App Router requires these
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",                                         // blob: for html2canvas exports
    "connect-src 'self'",
    "worker-src blob:",                                                    // jsPDF web worker
    "frame-ancestors 'none'",                                             // Equivalent to X-Frame-Options: DENY
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? 'false',
    },

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // ── Anti-clickjacking ──────────────────────────────────
                    { key: 'X-Frame-Options', value: 'DENY' },

                    // ── MIME sniffing ──────────────────────────────────────
                    { key: 'X-Content-Type-Options', value: 'nosniff' },

                    // ── Referrer ───────────────────────────────────────────
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

                    // ── DNS prefetch ───────────────────────────────────────
                    { key: 'X-DNS-Prefetch-Control', value: 'off' },

                    // ── Permissions ────────────────────────────────────────
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=()',
                    },

                    // ── Content Security Policy ────────────────────────────
                    { key: 'Content-Security-Policy', value: CSP },

                    // ── HSTS — HTTPS only, production only ─────────────────
                    ...(isProd ? [{
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    }] : []),
                ],
            },
        ];
    },
};

// Log environment mode at startup (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    console.info(
        `[THABAT] Environment: ${process.env.NODE_ENV} | ` +
        `Demo mode: ${isDemoMode ? 'ON (hardcoded demo data)' : 'OFF (production DB)'}`
    );
}

export default withNextIntl(nextConfig);
