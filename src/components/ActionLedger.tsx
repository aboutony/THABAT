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

    // Primary load: fetch from DB; fall back to localStorage for demo/guest
    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/ledger');
            if (res.ok) {
                const data = await res.json() as { entries: LedgerEntry[] };
                if (data.entries.length > 0) {
                    setEntries(data.entries);
                    return;
                }
            }
        } catch { /* fall through */ }
        // Fallback: localStorage (demo-tier / no session)
        setEntries(getLedger());
    }, []);

    useEffect(() => {
        refresh();
        // Re-sync on localStorage writes (COMMANDER entity switch, local adds)
        window.addEventListener('thabat-ledger-updated', refresh);
        return () => {
            window.removeEventListener('thabat-ledger-updated', refresh);
        };
    }, [refresh]);

    async function handleRealize(id: string) {
        markLedgerRealized(id);
        await refresh();
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
                                className={`${s.dot} ${
                                    entry.actionType === 'VERIFIED_STRATEGY' ? s.dotEmeraldVerified :
                                    entry.status === 'realized'              ? s.dotGreen  :
                                    entry.actionType === 'SUPPLY_CHAIN_PIVOT'? s.dotIndigo :
                                    entry.actionType === 'SCENARIO_PLAN'     ? s.dotViolet :
                                    s.dotAmber
                                }`}
                            />
                            {i < entries.length - 1 && <div className={s.connector} />}
                        </div>

                        {/* ── Entry card ───────────────────────────────── */}
                        <div className={`glass-card ${s.card}`}>
                            {/* Header row */}
                            <div className={s.cardHeader}>
                                <span className={s.date}>{formatDate(entry.date)}</span>
                                {entry.actionType === 'VERIFIED_STRATEGY' ? (
                                    <span className={s.badgeVerified}>
                                        ✓&nbsp;{t('verifiedBadge')}
                                    </span>
                                ) : entry.status === 'realized' ? (
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
                            {entry.actionType === 'SUPPLY_CHAIN_PIVOT' ? (
                                <p className={s.title}>
                                    <span className={s.titleIcon}>🚚</span>
                                    {entry.meta?.description ?? t('supplyChainPivotTitle')}
                                </p>
                            ) : entry.actionType === 'SCENARIO_PLAN' ? (
                                <p className={s.title}>
                                    <span className={s.titleIcon}>🎯</span>
                                    {t('scenarioPlanTitle')}
                                </p>
                            ) : entry.actionType === 'VERIFIED_STRATEGY' ? (
                                <p className={s.title}>
                                    <span className={s.titleIcon}>🧭</span>
                                    {t('verifiedStrategyTitle')}
                                </p>
                            ) : (
                                <p className={s.title}>
                                    {t('planTitle', { n: entry.plannedExpats ?? 0 })}
                                </p>
                            )}

                            {/* Chips */}
                            <div className={s.chips}>
                                {entry.actionType === 'SUPPLY_CHAIN_PIVOT' ? (
                                    <>
                                        <span className={`${s.chip} ${s.chipIndigo}`}>
                                            {entry.meta?.original} → {entry.meta?.alternative}
                                        </span>
                                        <span className={`${s.chip} ${s.chipGreen}`}>
                                            {formatSAR(entry.avoidedCost)}&nbsp;{t('safeguarded')}
                                        </span>
                                    </>
                                ) : entry.actionType === 'SCENARIO_PLAN' ? (
                                    <>
                                        <span className={`${s.chip} ${s.chipViolet}`}>
                                            {t('futureBadge')}
                                        </span>
                                        <span className={`${s.chip} ${s.chipViolet}`}>
                                            {formatSAR(entry.avoidedCost)}&nbsp;{t('projected')}
                                        </span>
                                    </>
                                ) : entry.actionType === 'VERIFIED_STRATEGY' ? (
                                    <>
                                        <span className={`${s.chip} ${s.chipEmeraldVerified}`}>
                                            ✓&nbsp;{t('activePlan')}
                                        </span>
                                        <span className={`${s.chip} ${s.chipEmeraldVerified}`}>
                                            {formatSAR(entry.avoidedCost)}&nbsp;{t('projected')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            className={s.chip}
                                            style={{ color: TIER_COLORS[entry.currentTier ?? ''] ?? 'var(--text-secondary)' }}
                                        >
                                            {entry.currentTier}
                                            {entry.tierDropped
                                                ? <> → <span style={{ color: TIER_COLORS[entry.projectedTier ?? ''] }}>{entry.projectedTier}</span> ⚠</>
                                                : ' ✓'
                                            }
                                        </span>
                                        <span className={`${s.chip} ${s.chipGreen}`}>
                                            {formatSAR(entry.avoidedCost)}&nbsp;{t('avoided')}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Correction note when tier would have dropped (Nitaqat only) */}
                            {entry.actionType !== 'SUPPLY_CHAIN_PIVOT' &&
                             entry.actionType !== 'SCENARIO_PLAN'     &&
                             entry.actionType !== 'VERIFIED_STRATEGY' &&
                             entry.tierDropped && (entry.correctionNeeded ?? 0) > 0 && (
                                <p className={s.correctionNote}>
                                    {t('correctionNote', { n: entry.correctionNeeded ?? 0 })}
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
