/**
 * EmptyState — shown in place of data-driven sections when a new
 * real organization has not yet ingested any metrics.
 *
 * Uses inline styles only so it renders correctly even before
 * CSS modules have loaded (same rationale as ErrorBoundary).
 */

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
    /** Primary heading, e.g. "No financial data yet" */
    title: string;
    /** Supporting sentence explaining what to do */
    message: string;
    /** Optional CTA button */
    action?: {
        label: string;
        href: string;
    };
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '32px 24px',
                borderRadius: 16,
                background: 'rgba(148,163,184,0.04)',
                border: '1px solid rgba(148,163,184,0.10)',
                textAlign: 'center',
            }}
        >
            {/* Icon */}
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(148,163,184,0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
            >
                <path d="M3 3h18v18H3z" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
            </svg>

            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'rgba(148,163,184,0.75)' }}>
                {title}
            </p>

            <p style={{ margin: 0, fontSize: 12, color: 'rgba(148,163,184,0.45)', maxWidth: 260, lineHeight: 1.55 }}>
                {message}
            </p>

            {action && (
                <Link
                    href={action.href}
                    style={{
                        marginTop: 4,
                        padding: '8px 20px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#fff',
                        background: 'rgba(148,163,184,0.12)',
                        border: '1px solid rgba(148,163,184,0.20)',
                        textDecoration: 'none',
                    }}
                >
                    {action.label}
                </Link>
            )}
        </div>
    );
}
