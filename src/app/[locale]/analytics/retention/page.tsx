'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import Shell from '@/components/Shell';
import ClientConstellation from '@/components/ClientConstellation';
import ActionToast from '@/components/ActionToast';
import {
    CLIENT_HEALTH_RESULTS,
    getAtRiskClients,
    type ClientHealthResult,
} from '@/lib/calculateClientHealth';
import { executeActionBridge, type ActionResult } from '@/lib/executeActionBridge';
import { useIdentity } from '@/hooks/useIdentity';
import s from './retention.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function HealthBar({ score, color }: { score: number; color: string }) {
    return (
        <div className={s.healthBarOuter}>
            <motion.div
                className={s.healthBarFill}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ background: color }}
            />
        </div>
    );
}

function ScoreBreakdown({ client }: { client: ClientHealthResult }) {
    const isAr = useLocale() === 'ar';
    const rows = [
        {
            label: isAr ? 'سرعة الإيرادات (40%)' : 'Revenue Velocity (40%)',
            score: client.revenueVelocityScore,
        },
        {
            label: isAr ? 'انضباط الدفع (40%)' : 'Payment Hygiene (40%)',
            score: client.paymentScore,
        },
        {
            label: isAr ? 'التفاعل (20%)' : 'Engagement (20%)',
            score: client.engagementScore,
        },
    ];
    return (
        <div className={s.breakdown}>
            {rows.map(row => (
                <div key={row.label} className={s.breakdownRow}>
                    <span className={s.breakdownLabel}>{row.label}</span>
                    <div className={s.breakdownBar}>
                        <motion.div
                            className={s.breakdownFill}
                            initial={{ width: 0 }}
                            animate={{ width: `${row.score}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                                background: row.score >= 70
                                    ? '#4ADE80'
                                    : row.score >= 50
                                        ? '#F59E0B'
                                        : '#F87171',
                            }}
                        />
                    </div>
                    <span className={s.breakdownVal}>{row.score}</span>
                </div>
            ))}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RetentionSentinelPage() {
    const locale  = useLocale();
    const isAr    = locale === 'ar';
    const [outreachSent,  setOutreachSent]  = useState<Record<string, boolean>>({});
    const [expanded,      setExpanded]      = useState<string | null>(null);
    const [toastResult,   setToastResult]   = useState<ActionResult | null>(null);

    const { isClient } = useIdentity();
    const atRisk      = getAtRiskClients().slice(0, 5);
    const healthy     = CLIENT_HEALTH_RESULTS.filter(c => !c.isFlickering);
    const atRiskCount = CLIENT_HEALTH_RESULTS.filter(c => c.isFlickering).length;

    const handleOutreach = useCallback(async (client: ClientHealthResult) => {
        if (outreachSent[client.id]) return;
        setOutreachSent(prev => ({ ...prev, [client.id]: true }));
        const result = await executeActionBridge({
            type:    'EMAIL_OUTREACH',
            target:  isAr ? client.name.ar : client.name.en,
            subject: `Health score ${client.healthScore} — proactive retention outreach`,
            priority: 'high',
        });
        setToastResult(result);
        // "Signal Sent" state persists for 5 s
        setTimeout(() => setOutreachSent(prev => ({ ...prev, [client.id]: false })), 5000);
    }, [outreachSent, isAr]);

    const dismissToast = useCallback(() => setToastResult(null), []);

    const riskLabel = (r: ClientHealthResult['riskLevel']) => {
        const map: Record<typeof r, { en: string; ar: string }> = {
            healthy:  { en: 'Healthy',   ar: 'بصحة جيدة' },
            watch:    { en: 'Watch',      ar: 'يحتاج مراقبة' },
            'at-risk':{ en: 'At Risk',    ar: 'في خطر' },
            critical: { en: 'Critical',   ar: 'حرج' },
        };
        return isAr ? map[r].ar : map[r].en;
    };

    return (
        <>
        <Shell>
            <div className={s.page}>
                <Link href={`/${locale}/analytics`} className={s.backLink}>
                    {isAr ? '→' : '←'} {isAr ? 'الاستخبارات' : 'Analytics'}
                </Link>

                {/* ── Page header ─────────────────────────────────────── */}
                <div className={s.pageHeader}>
                    <h1 className={s.pageTitle}>
                        {isAr ? 'حارس الاستبقاء' : 'Retention Sentinel'}
                    </h1>
                    <p className={s.pageSubtitle}>
                        {isAr
                            ? 'صحة العملاء • وقت القيمة • الإجراءات الاستباقية'
                            : 'Client health · churn signals · proactive outreach'}
                    </p>
                </div>

                {/* ── Summary stats ────────────────────────────────────── */}
                <div className={s.statsRow}>
                    <div className={s.stat}>
                        <span className={s.statNum} style={{ color: '#4ADE80' }}>
                            {CLIENT_HEALTH_RESULTS.length}
                        </span>
                        <span className={s.statLabel}>{isAr ? 'عملاء' : 'Clients'}</span>
                    </div>
                    <div className={s.statDivider} />
                    <div className={s.stat}>
                        <span className={s.statNum} style={{ color: '#F59E0B' }}>
                            {atRiskCount}
                        </span>
                        <span className={s.statLabel}>{isAr ? 'في خطر' : 'At Risk'}</span>
                    </div>
                    <div className={s.statDivider} />
                    <div className={s.stat}>
                        <span className={s.statNum} style={{ color: '#4ADE80' }}>
                            {healthy.length}
                        </span>
                        <span className={s.statLabel}>{isAr ? 'بصحة جيدة' : 'Healthy'}</span>
                    </div>
                </div>

                {/* ── Constellation ────────────────────────────────────── */}
                <ClientConstellation />

                {/* ── At-risk client list (hidden for CLIENT tier) ─────── */}
                {!isClient && (
                <div
                    className={isAr ? s.sectionHeaderArabic : s.sectionLabel}
                    style={isAr ? { textAlign: 'right', width: '100%' } : undefined}
                >
                    {isAr ? 'أعلى 5 عملاء في خطر' : 'Top 5 At-Risk Clients'}
                </div>
                )}

                {!isClient && atRisk.map((client, i) => {
                    const isExpanded = expanded === client.id;
                    return (
                        <motion.div
                            key={client.id}
                            className={s.clientCard}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            style={{ borderColor: `${client.color}33` }}
                        >
                            {/* Card header */}
                            <button
                                className={s.cardHeader}
                                onClick={() => setExpanded(isExpanded ? null : client.id)}
                            >
                                <div
                                    className={s.clientMeta}
                                    style={isAr ? { alignItems: 'flex-end' } : undefined}
                                >
                                    <span
                                        className={s.clientName}
                                        style={isAr ? { marginLeft: 'auto', textAlign: 'right' } : undefined}
                                    >
                                        {isAr ? client.name.ar : client.name.en}
                                    </span>
                                    <span className={s.riskBadge} style={{
                                        color: client.color,
                                        background: `${client.color}18`,
                                        borderColor: `${client.color}30`,
                                        ...(isAr ? { marginLeft: 'auto' } : {}),
                                    }}>
                                        {riskLabel(client.riskLevel)}
                                    </span>
                                </div>
                                <div className={s.cardRight}>
                                    <span className={s.healthNum} style={{ color: client.color }}>
                                        {client.healthScore}
                                    </span>
                                    <HealthBar score={client.healthScore} color={client.color} />
                                </div>
                            </button>

                            {/* Expanded breakdown + outreach */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        className={s.expandSection}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <ScoreBreakdown client={client} />

                                        <div className={s.daysRow}>
                                            <span className={s.daysLabel}>
                                                {isAr ? 'متوسط أيام التأخر في الدفع' : 'Avg days overdue'}
                                            </span>
                                            <span className={s.daysVal}
                                                style={{ color: client.paymentScore < 50 ? '#F87171' : '#F59E0B' }}>
                                                {client.avgDaysOverdue}d
                                            </span>
                                        </div>

                                        <button
                                            className={`${s.outreachBtn} ${outreachSent[client.id] ? s.outreachSent : ''}`}
                                            onClick={() => handleOutreach(client)}
                                            disabled={outreachSent[client.id]}
                                        >
                                            {outreachSent[client.id]
                                                ? (isAr ? '✓ تم إرسال الإشارة' : '✓ Signal Sent')
                                                : (isAr ? 'بدء التواصل' : 'Initiate Outreach')}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}

                {/* ── Healthy clients (hidden for CLIENT tier) ─────────── */}
                {!isClient && healthy.length > 0 && (
                    <div className={s.healthySection}>
                        <div className={s.sectionLabel}>
                            {isAr ? 'العملاء بصحة جيدة' : 'Healthy Clients'}
                        </div>
                        <div className={s.healthyList}>
                            {healthy.map(client => (
                                <div key={client.id} className={s.healthyItem}>
                                    <span className={s.healthyDot}
                                        style={{ background: client.color }} />
                                    <span className={s.healthyName}>
                                        {isAr ? client.name.ar : client.name.en}
                                    </span>
                                    <span className={s.healthyScore} style={{ color: client.color }}>
                                        {client.healthScore}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Shell>
        <ActionToast result={toastResult} onDismiss={dismissToast} />
        </>
    );
}
