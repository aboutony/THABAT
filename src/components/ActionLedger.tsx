'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getLedger,
    markLedgerRealized,
    type LedgerEntry,
} from '@/lib/ledger';
import s from './ActionLedger.module.css';

// ── Formatting helpers ────────────────────────────────────────────────────

function formatSAR(n: number): string {
    return `SAR ${n.toLocaleString('en-SA')}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-SA', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

// ── Tier colour map (matches NitaqatShield colours) ───────────────────────
const TIER_COLORS: Record<string, string> = {
    platinum:  '#D4AF37',
    highGreen: '#2D6A4F',
    medGreen:  '#52B788',
    lowGreen:  '#B7E4C7',
    red:       '#9B2335',
};

// ── Component ─────────────────────────────────────────────────────────────

export default function ActionLedger() {
    const t = useTranslations('ledger');
    const [entries, setEntries] = useState<LedgerEntry[]>([]);

    const refresh = useCallback(() => setEntries(getLedger()), []);

    useEffect(() => {
        refresh();
        window.addEventListener('storage',                refresh);
        window.addEventListener('thabat-ledger-updated', refresh);
        return () => {
            window.removeEventListener('storage',                refresh);
            window.removeEventListener('thabat-ledger-updated', refresh);
        };
    }, [refresh]);

    function handleRealize(id: string) {
        markLedgerRealized(id);
        refresh();
    }

    // ── Empty state ───────────────────────────────────────────────────────
    if (entries.length === 0) {
        return (
            <div className={s.empty}>
                <span className={s.emptyIcon}>📋</span>
                <p className={s.emptyText}>{t('empty')}</p>
            </div>
        );
    }

    // ── Timeline ──────────────────────────────────────────────────────────
    return (
        <div className={s.timeline}>
            <AnimatePresence initial={false}>
                {entries.map((entry, i) => (
                    <motion.div
                        key={entry.id}
                        className={`${s.row} ${entry.status === 'realized' ? s.rowRealized : ''}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                    >
                        {/* ── Timeline spine ───────────────────────────── */}
                        <div className={s.spine}>
                            <div
                                className={`${s.dot} ${entry.status === 'realized' ? s.dotGreen : s.dotAmber}`}
                            />
                            {i < entries.length - 1 && <div className={s.connector} />}
                        </div>

                        {/* ── Entry card ───────────────────────────────── */}
                        <div className={`glass-card ${s.card}`}>
                            {/* Header row */}
                            <div className={s.cardHeader}>
                                <span className={s.date}>{formatDate(entry.date)}</span>
                                {entry.status === 'realized' ? (
                                    <span className={s.badgeRealized}>
                                        ✓&nbsp;{t('realized')}
                                    </span>
                                ) : (
                                    <button
                                        className={s.badgePending}
                                        onClick={() => handleRealize(entry.id)}
                                    >
                                        {t('markRealized')}
                                    </button>
                                )}
                            </div>

                            {/* Action title */}
                            <p className={s.title}>
                                {t('planTitle', { n: entry.plannedExpats })}
                            </p>

                            {/* Tier + avoided cost chips */}
                            <div className={s.chips}>
                                <span
                                    className={s.chip}
                                    style={{ color: TIER_COLORS[entry.currentTier] ?? 'var(--text-secondary)' }}
                                >
                                    {entry.currentTier}
                                    {entry.tierDropped
                                        ? <> → <span style={{ color: TIER_COLORS[entry.projectedTier] }}>{entry.projectedTier}</span> ⚠</>
                                        : ' ✓'
                                    }
                                </span>
                                <span className={`${s.chip} ${s.chipGreen}`}>
                                    {formatSAR(entry.avoidedCost)}&nbsp;{t('avoided')}
                                </span>
                            </div>

                            {/* Correction note when tier would have dropped */}
                            {entry.tierDropped && entry.correctionNeeded > 0 && (
                                <p className={s.correctionNote}>
                                    {t('correctionNote', { n: entry.correctionNeeded })}
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
