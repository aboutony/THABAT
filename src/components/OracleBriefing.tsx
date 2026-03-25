'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    generateBriefing,
    DEMO_NITAQAT_TIER,
} from '@/lib/generateBriefing';
import type { BriefingContext, RiskKey, ActionKey } from '@/lib/generateBriefing';
import { calculateStockGap, DEMO_STOCK_GAP_INPUT } from '@/lib/stockGap';
import { useEntity } from '@/context/EntityContext';
import s from './OracleBriefing.module.css';

// ── Props ─────────────────────────────────────────────────────────────────────

interface OracleBriefingProps {
    score:          number;
    scoreBreakdown?: { margins: number; receivables: number; liquidity: number; };
}

// ── Glow class by health score ─────────────────────────────────────────────

function glowClass(score: number): string {
    if (score >= 75) return s.glowEmerald;
    if (score >= 50) return s.glowIndigo;
    return s.glowAmber;
}

// ── Sentence builders ────────────────────────────────────────────────────────
// Each returns a single interpolated string from the oracle.sent{1,2,3} keys.

function useSentences(ctx: BriefingContext | null, locale: string) {
    const t = useTranslations('oracle');

    if (!ctx) return { s1: '', s2: '', s3: '' };

    const sarValue = ctx.actionValue.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-SA');

    const rk: RiskKey   = ctx.riskKey;
    const ak: ActionKey = ctx.actionKey;

    const s1 = t(`sent1.${rk}`, { n: ctx.stockDays, lead: ctx.leadDays });
    const s2 = t(`sent2.${ak}`, { value: sarValue, meta: ctx.actionMeta });
    const s3 = t(`sent3.${rk}`);

    return { s1, s2, s3 };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OracleBriefing({ score, scoreBreakdown }: OracleBriefingProps) {
    const locale        = useLocale();
    const t             = useTranslations('oracle');
    const { activeEntity } = useEntity();

    const [ctx,       setCtx]       = useState<BriefingContext | null>(null);
    const [revealed,  setRevealed]  = useState(0);   // 0 = thinking, 1/2/3 = sentences visible
    const [cursorOn,  setCursorOn]  = useState(true);

    // Build context client-side (reads localStorage ledger)
    useEffect(() => {
        const stockGap = calculateStockGap(DEMO_STOCK_GAP_INPUT);
        const context  = generateBriefing({
            score,
            stockGap,
            nitaqatTier:    DEMO_NITAQAT_TIER,
            scoreBreakdown,
        });
        setCtx(context);
    }, [score, scoreBreakdown]);

    // Staggered reveal — sentence 1 at 320ms, then +600ms each
    useEffect(() => {
        if (!ctx) return;
        const timers = [
            setTimeout(() => setRevealed(1), 320),
            setTimeout(() => setRevealed(2), 920),
            setTimeout(() => setRevealed(3), 1520),
            // Hide cursor 1.8s after all text is shown
            setTimeout(() => setCursorOn(false), 3400),
        ];
        return () => timers.forEach(clearTimeout);
    }, [ctx]);

    const { s1, s2, s3 } = useSentences(ctx, locale);
    const glow = glowClass(score);

    const deepHref = ctx
        ? `/${locale}/analytics/${ctx.riskModule}`
        : `/${locale}/analytics`;

    return (
        <div className={`glass-card ${s.card} ${glow}`}>

            {/* ── Header ────────────────────────────────────────────── */}
            <div className={s.header}>
                <span className={s.oracleIcon}>✦</span>
                <p className={s.sectionLabel}>{t('section')}</p>
                {/* Sovereign badge — confirms which entity the Oracle is advising */}
                <span
                    className={s.sovereignBadge}
                    style={{ borderColor: `${activeEntity.accent}44`, color: activeEntity.accent }}
                >
                    ⬡&nbsp;{locale === 'ar' ? activeEntity.nameAr : activeEntity.name}
                </span>
                <AnimatePresence>
                    {revealed === 0 && (
                        <motion.span
                            key="dots"
                            className={s.thinkingDots}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <span /><span /><span />
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Briefing body ─────────────────────────────────────── */}
            <div className={s.body}>
                <AnimatePresence>
                    {revealed >= 1 && (
                        <motion.p
                            key="s1"
                            className={s.sentence}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                        >
                            {s1}
                        </motion.p>
                    )}
                    {revealed >= 2 && (
                        <motion.p
                            key="s2"
                            className={s.sentence}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                        >
                            {s2}
                        </motion.p>
                    )}
                    {revealed >= 3 && (
                        <motion.p
                            key="s3"
                            className={s.sentence}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                        >
                            {s3}
                            {cursorOn && <span className={s.cursor} aria-hidden="true" />}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Deep-link button ─────────────────────────────────── */}
            <AnimatePresence>
                {revealed >= 3 && (
                    <motion.div
                        key="link"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.35 }}
                    >
                        <Link href={deepHref} className={s.deepLink}>
                            {t('tellMore')}
                            <span className={s.arrow} aria-hidden="true">
                                {locale === 'ar' ? '←' : '→'}
                            </span>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
