/**
 * ErrorBoundary — Phase 1.4
 *
 * A single class-component boundary used at two granularities:
 *
 *   1. Global (layout level) — wraps the entire app tree.
 *      Shows a full-screen fallback preventing a blank white page.
 *
 *   2. Section (page level) — wraps individual analytics panels.
 *      Shows an inline card so the rest of the page stays usable.
 *
 * Usage:
 *   <ErrorBoundary>                         // global — full-page fallback
 *     {children}
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary section="Nitaqat">      // section — inline card fallback
 *     <NitaqatShield />
 *   </ErrorBoundary>
 *
 * Why a class component: React error boundaries require componentDidCatch /
 * getDerivedStateFromError, which are not available in function components.
 */

'use client';

import React from 'react';

interface Props {
    children: React.ReactNode;
    /**
     * When provided the boundary renders an inline card fallback instead
     * of the full-page variant. Value is used in the error header.
     */
    section?: string;
    /** Optional custom fallback — replaces the default UI entirely. */
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            errorMessage: error?.message ?? 'An unexpected error occurred.',
        };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log to console in all environments (Sentry integration added in Phase 1.8.3)
        console.error('[THABAT] Unhandled React error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        const { hasError, errorMessage } = this.state;
        const { children, section, fallback } = this.props;

        if (!hasError) return children;

        // Custom fallback takes full priority
        if (fallback) return fallback;

        // ── Inline section fallback ──────────────────────────────────────────
        if (section) {
            return (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionIcon}>⚠</div>
                    <div style={styles.sectionTitle}>
                        {section} — Unable to load
                    </div>
                    <div style={styles.sectionMessage}>
                        {errorMessage}
                    </div>
                    <button style={styles.retryBtn} onClick={this.handleReset}>
                        Retry
                    </button>
                </div>
            );
        }

        // ── Full-page global fallback ─────────────────────────────────────────
        return (
            <div style={styles.fullPage}>
                <div style={styles.panel}>
                    <div style={styles.logo}>ث</div>
                    <h1 style={styles.heading}>Something went wrong</h1>
                    <p style={styles.subHeading}>
                        THABAT encountered an unexpected error.
                    </p>
                    <p style={styles.detail}>{errorMessage}</p>
                    <div style={styles.btnRow}>
                        <button
                            style={styles.primaryBtn}
                            onClick={() => window.location.reload()}
                        >
                            Reload page
                        </button>
                        <button
                            style={styles.secondaryBtn}
                            onClick={this.handleReset}
                        >
                            Try again
                        </button>
                    </div>
                    <p style={styles.hint}>
                        If this persists, contact your system administrator.
                    </p>
                </div>
            </div>
        );
    }
}

// ─── Inline styles (no CSS module dependency — boundary must render even if
//     CSS loading itself caused the crash) ───────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    // Full-page
    fullPage: {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #0F111A)',
        zIndex: 9999,
        padding: '24px',
        fontFamily: 'inherit',
    },
    panel: {
        maxWidth: 420,
        width: '100%',
        background: 'rgba(30,33,48,0.9)',
        border: '1px solid rgba(148,163,184,0.15)',
        borderRadius: 16,
        padding: '40px 32px',
        textAlign: 'center',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    },
    logo: {
        fontSize: 48,
        fontWeight: 700,
        color: 'var(--brand, #60A5FA)',
        marginBottom: 16,
        lineHeight: 1,
    },
    heading: {
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--text-primary, #F1F5F9)',
        margin: '0 0 8px',
    },
    subHeading: {
        fontSize: 14,
        color: 'var(--text-secondary, #94A3B8)',
        margin: '0 0 16px',
    },
    detail: {
        fontSize: 12,
        color: 'var(--danger, #F87171)',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.18)',
        borderRadius: 8,
        padding: '8px 12px',
        margin: '0 0 24px',
        wordBreak: 'break-word',
        textAlign: 'left',
    },
    btnRow: {
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        marginBottom: 16,
    },
    primaryBtn: {
        padding: '10px 20px',
        borderRadius: 8,
        border: 'none',
        background: 'var(--brand, #3B82F6)',
        color: '#fff',
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
    },
    secondaryBtn: {
        padding: '10px 20px',
        borderRadius: 8,
        border: '1px solid rgba(148,163,184,0.25)',
        background: 'transparent',
        color: 'var(--text-secondary, #94A3B8)',
        fontWeight: 500,
        fontSize: 14,
        cursor: 'pointer',
    },
    hint: {
        fontSize: 11,
        color: 'rgba(148,163,184,0.5)',
        margin: 0,
    },

    // Section card
    sectionCard: {
        borderRadius: 12,
        border: '1px solid rgba(248,113,113,0.2)',
        background: 'rgba(248,113,113,0.05)',
        padding: '20px 16px',
        textAlign: 'center',
        margin: '8px 0',
    },
    sectionIcon: {
        fontSize: 22,
        color: 'var(--warning, #F59E0B)',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary, #F1F5F9)',
        marginBottom: 6,
    },
    sectionMessage: {
        fontSize: 11,
        color: 'var(--danger, #F87171)',
        marginBottom: 12,
        wordBreak: 'break-word',
    },
    retryBtn: {
        padding: '6px 16px',
        borderRadius: 6,
        border: '1px solid rgba(148,163,184,0.2)',
        background: 'transparent',
        color: 'var(--text-secondary, #94A3B8)',
        fontSize: 12,
        cursor: 'pointer',
    },
};
