'use client';

import { forwardRef } from 'react';
import type { BoardReport } from '@/lib/generateBoardReport';
import s from './ReportDocument.module.css';

interface ReportDocumentProps {
    report: BoardReport;
}

// Rendered off-screen inside ExportPortal; captured by html2canvas.
const ReportDocument = forwardRef<HTMLDivElement, ReportDocumentProps>(
    function ReportDocument({ report }, ref) {
        const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-SA', {
            day: 'numeric', month: 'long', year: 'numeric',
        });

        const tierLabel = report.lastKnownTier.charAt(0).toUpperCase() + report.lastKnownTier.slice(1);

        return (
            <div ref={ref} className={s.document}>

                {/* Background watermark */}
                <div className={s.watermark} aria-hidden>THABAT</div>

                {/* ── Header ──────────────────────────────────────────── */}
                <div className={s.header}>
                    <div className={s.headerBrand}>
                        <span className={s.brandMark}>⬡</span>
                        <div>
                            <p className={s.brandName}>THABAT</p>
                            <p className={s.brandSub}>Stability Intelligence</p>
                        </div>
                    </div>
                    <div className={s.headerMeta}>
                        <p className={s.reportType}>Board Capital Report</p>
                        <p className={s.reportDate}>{generatedDate}</p>
                        <p className={s.reportPeriod}>30-Day Executive Summary</p>
                    </div>
                </div>

                <div className={s.divider} />

                {/* ── 01 Executive Summary ────────────────────────────── */}
                <div className={s.section}>
                    <p className={s.sectionLabel}>01 — Executive Summary</p>
                    <div className={s.kpiRow}>
                        <div className={s.kpi}>
                            <p className={s.kpiVal}>{report.healthScore}</p>
                            <p className={s.kpiLabel}>Stability Score</p>
                        </div>
                        <div className={s.kpi}>
                            <p className={s.kpiVal}>
                                SAR {report.totalValueProtected.toLocaleString('en-SA')}
                            </p>
                            <p className={s.kpiLabel}>Value Protected</p>
                        </div>
                        <div className={s.kpi}>
                            <p className={s.kpiVal}>
                                {report.realizedCount + report.pendingCount}
                            </p>
                            <p className={s.kpiLabel}>Strategic Actions</p>
                        </div>
                    </div>
                </div>

                <div className={s.divider} />

                {/* ── 02 Compliance & Workforce ───────────────────────── */}
                <div className={s.section}>
                    <p className={s.sectionLabel}>02 — Compliance & Workforce</p>
                    <div className={s.complianceBlock}>
                        <div className={s.tierBadge}>
                            <span className={s.tierDot} data-tier={report.lastKnownTier} />
                            <span className={s.tierText}>{tierLabel} Nitaqat</span>
                        </div>
                        <p className={s.bodyText}>
                            Compliance score: {report.complianceScore}/100.
                            {report.tierDropPrevented > 0
                                ? ` ${report.tierDropPrevented} tier-drop event(s) corrected this period.`
                                : ' No tier violations recorded this period.'
                            }
                        </p>
                    </div>
                </div>

                <div className={s.divider} />

                {/* ── 03 Supply Chain Resilience ──────────────────────── */}
                <div className={s.section}>
                    <p className={s.sectionLabel}>03 — Supply Chain Resilience</p>
                    {report.pivotEntries.length > 0 ? (
                        <>
                            <p className={s.bodyText}>
                                {report.pivotEntries.length} supplier pivot(s) executed —
                                SAR {report.safeguardedValue.toLocaleString('en-SA')} in
                                continuity value safeguarded.
                            </p>
                            {report.pivotEntries.slice(0, 3).map(e => (
                                <div key={e.id} className={s.evidenceRow}>
                                    <span className={s.evidenceIcon}>🚚</span>
                                    <p className={s.evidenceText}>
                                        {e.meta?.description ?? 'Supply chain pivot'}
                                        {' '}— SAR {e.avoidedCost.toLocaleString('en-SA')}
                                    </p>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className={s.bodyText}>
                            No supply chain pivots recorded this period.
                            Baseline continuity maintained.
                        </p>
                    )}
                </div>

                <div className={s.divider} />

                {/* ── 04 Strategic Outlook ────────────────────────────── */}
                <div className={s.section}>
                    <p className={s.sectionLabel}>04 — Strategic Outlook</p>
                    {report.scenarioSnapshot ? (
                        <>
                            <p className={s.bodyText}>
                                Pathfinder optimizer active. Projected net margin:{' '}
                                {report.scenarioSnapshot.projectedMarginPct}%.
                                Nitaqat standing: {report.scenarioSnapshot.projectedTier}.
                            </p>
                            <div className={s.scenarioGrid}>
                                <div className={s.scenarioCell}>
                                    <p className={s.scenarioCellVal}>
                                        +{report.scenarioSnapshot.salesGrowthPct}%
                                    </p>
                                    <p className={s.scenarioCellLabel}>Sales Growth</p>
                                </div>
                                <div className={s.scenarioCell}>
                                    <p className={s.scenarioCellVal}>
                                        {report.scenarioSnapshot.expatsHired}
                                    </p>
                                    <p className={s.scenarioCellLabel}>Expat Hires</p>
                                </div>
                                <div className={s.scenarioCell}>
                                    <p className={s.scenarioCellVal}>
                                        {report.scenarioSnapshot.materialCostDelta > 0 ? '+' : ''}
                                        {report.scenarioSnapshot.materialCostDelta}%
                                    </p>
                                    <p className={s.scenarioCellLabel}>Material Δ</p>
                                </div>
                            </div>
                            {report.topStrategyImpact > 0 && (
                                <p className={s.impactLine}>
                                    Estimated annual impact:{' '}
                                    <strong>SAR {report.topStrategyImpact.toLocaleString('en-SA')}</strong>
                                </p>
                            )}
                        </>
                    ) : (
                        <p className={s.bodyText}>
                            No scenario plans on record. Launch the Scenario Lab to model
                            strategic outcomes for this report.
                        </p>
                    )}
                </div>

                {/* ── 05 Requested Simulation Analysis ────────────────── */}
                {report.sessionSimulation && (
                    <>
                        <div className={s.divider} />
                        <div className={s.section}>
                            <p className={s.sectionLabel}>05 — Requested Simulation Analysis</p>
                            <p className={s.bodyText}>
                                The following What-If configuration was active during this report session.
                            </p>
                            <div className={s.scenarioGrid}>
                                <div className={s.scenarioCell}>
                                    <p className={s.scenarioCellVal}>
                                        {report.sessionSimulation.salesGrowthPct > 0 ? '+' : ''}
                                        {report.sessionSimulation.salesGrowthPct}%
                                    </p>
                                    <p className={s.scenarioCellLabel}>Sales Growth</p>
                                </div>
                                <div className={s.scenarioCell}>
                                    <p className={s.scenarioCellVal}>
                                        {report.sessionSimulation.expatsHired}
                                    </p>
                                    <p className={s.scenarioCellLabel}>Expat Hires</p>
                                </div>
                                <div className={s.scenarioCell}>
                                    <p className={s.scenarioCellVal}>
                                        {report.sessionSimulation.materialCostDelta > 0 ? '+' : ''}
                                        {report.sessionSimulation.materialCostDelta}%
                                    </p>
                                    <p className={s.scenarioCellLabel}>Material Δ</p>
                                </div>
                            </div>
                            <p className={s.bodyText} style={{ marginTop: 8 }}>
                                Projected net margin: {report.sessionSimulation.projectedMarginPct}%.
                                Projected Nitaqat standing: {report.sessionSimulation.projectedTier}.
                            </p>
                            {report.sessionSimulation.estimatedAnnualImpact !== 0 && (
                                <p className={s.impactLine}>
                                    Estimated annual impact:{' '}
                                    <strong>
                                        {report.sessionSimulation.estimatedAnnualImpact > 0 ? '+' : ''}
                                        SAR {Math.abs(report.sessionSimulation.estimatedAnnualImpact).toLocaleString('en-SA')}
                                    </strong>
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* ── Footer ──────────────────────────────────────────── */}
                <div className={s.footer}>
                    <p className={s.footerText}>
                        Confidential — THABAT Stability Intelligence · Generated {generatedDate}
                    </p>
                    <p className={s.footerWatermark}>THABAT</p>
                </div>

            </div>
        );
    }
);

export default ReportDocument;
