'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { generateBoardReport, type BoardReport } from '@/lib/generateBoardReport';
import ErrorBoundary from '@/components/ErrorBoundary';
import s from './investor.module.css';

// ── Score → display band ────────────────────────────────────────────────────

function scoreBand(score: number): 'strong' | 'stable' | 'developing' {
    if (score >= 75) return 'strong';
    if (score >= 50) return 'stable';
    return 'developing';
}

// ── Nitaqat tier dot class ───────────────────────────────────────────────────

const TIER_DOT_CLASS: Record<string, string> = {
    platinum:  s.tierDotPlatinum,
    highGreen: s.tierDotHighGreen,
    medGreen:  s.tierDotMedGreen,
    lowGreen:  s.tierDotLowGreen,
    red:       s.tierDotRed,
};

// ── Component ─────────────────────────────────────────────────────────────

export default function InvestorView() {
    const t      = useTranslations('investor');
    const locale = useLocale();

    // Demo score — in a real app this would come from an API
    const DEMO_SCORE = 87;

    const [report, setReport] = useState<BoardReport | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReport(generateBoardReport(DEMO_SCORE));
    }, []);

    const viewDate = new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-SA', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    const band = scoreBand(DEMO_SCORE);

    const bandClass =
        band === 'strong'     ? s.scoreBandStrong :
        band === 'stable'     ? s.scoreBandStable :
        s.scoreBandDev;

    const bandLabel =
        band === 'strong'     ? t('strong') :
        band === 'stable'     ? t('stable') :
        t('developing');

    return (
        <ErrorBoundary section="Investor Report">
        <div className={s.page}>
            <div className={s.inner}>

                {/* ── Header ──────────────────────────────────────────── */}
                <div className={s.header}>
                    <div className={s.headerBrand}>
                        <span className={s.brandMark}>⬡</span>
                        <p className={s.brandName}>THABAT</p>
                    </div>
                    <span className={s.readOnlyBadge}>{t('badge')}</span>
                </div>

                <div className={s.content}>

                    {/* ── Performance Band ────────────────────────────── */}
                    <div className={s.sectionCard}>
                        <div className={s.sectionHead}>
                            <span className={s.sectionIcon}>📈</span>
                            <p className={s.sectionTitle}>{t('scoreLabel')}</p>
                        </div>
                        <div className={s.sectionBody}>
                            <div className={s.scoreBandRow}>
                                <p className={`${s.scoreBand} ${bandClass}`}>
                                    {/* Show rounded band rather than exact score */}
                                    {band === 'strong' ? '80+' : band === 'stable' ? '50+' : '<50'}
                                </p>
                                <div className={s.scoreBandMeta}>
                                    <p className={s.scoreBandLabel}>{t('scoreLabel')}</p>
                                    <p className={s.scoreBandDesc}>{bandLabel}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Compliance Standing ─────────────────────────── */}
                    <div className={s.sectionCard}>
                        <div className={s.sectionHead}>
                            <span className={s.sectionIcon}>🛡</span>
                            <p className={s.sectionTitle}>{t('complianceLabel')}</p>
                        </div>
                        <div className={s.sectionBody}>
                            <div className={s.complianceRow}>
                                <span
                                    className={`${s.tierDot} ${TIER_DOT_CLASS[report?.lastKnownTier ?? 'platinum'] ?? s.tierDotPlatinum}`}
                                />
                                <p className={s.complianceLabel}>
                                    {report?.lastKnownTier
                                        ? report.lastKnownTier.charAt(0).toUpperCase() + report.lastKnownTier.slice(1)
                                        : 'Platinum'
                                    } Nitaqat
                                </p>
                                <p className={s.complianceSub}>
                                    {report?.complianceScore ?? 100}/100
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Verified Strategies ─────────────────────────── */}
                    <div className={s.sectionCard}>
                        <div className={s.sectionHead}>
                            <span className={s.sectionIcon}>🧭</span>
                            <p className={s.sectionTitle}>{t('strategiesLabel')}</p>
                        </div>
                        <div className={s.sectionBody}>
                            {report && report.verifiedStrategies.length > 0 ? (
                                report.verifiedStrategies.map(e => (
                                    <div key={e.id} className={s.strategyItem}>
                                        <span className={s.strategyIcon}>✦</span>
                                        <p className={s.strategyText}>
                                            {e.scenarioMeta
                                                ? `Margin ${e.scenarioMeta.projectedMarginPct}% · ${e.scenarioMeta.projectedTier} Nitaqat`
                                                : t('strategiesLabel')
                                            }
                                        </p>
                                        <span className={s.strategyImpact}>
                                            SAR {e.avoidedCost.toLocaleString('en-SA')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className={s.emptyNote}>{t('noStrategies')}</p>
                            )}
                        </div>
                    </div>

                    {/* ── Capital Protected ────────────────────────────── */}
                    {report && report.totalValueProtected > 0 && (
                        <div className={s.sectionCard}>
                            <div className={s.sectionHead}>
                                <span className={s.sectionIcon}>💎</span>
                                <p className={s.sectionTitle}>{t('protectedLabel')}</p>
                            </div>
                            <div className={s.sectionBody}>
                                <p className={s.protectedAmount}>
                                    SAR {report.totalValueProtected.toLocaleString('en-SA')}
                                </p>
                                <p className={s.protectedSub}>{t('protectedSub')}</p>
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Footer ──────────────────────────────────────────── */}
                <div className={s.footer}>
                    <p className={s.footerText}>
                        {t('viewDate')} {viewDate}
                    </p>
                    <p className={s.footerText}>{t('confidential')}</p>
                    <p className={s.footerBrand}>THABAT</p>
                </div>

            </div>
        </div>
        </ErrorBoundary>
    );
}
