'use client';

import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { generateBoardReport, type BoardReport } from '@/lib/generateBoardReport';
import ReportDocument from './ReportDocument';
import s from './ExportPortal.module.css';

interface ExportPortalProps {
    onClose: () => void;
    healthScore: number;
}

export default function ExportPortal({ onClose, healthScore }: ExportPortalProps) {
    const t      = useTranslations('report');
    const locale = useLocale();

    const report = useMemo<BoardReport>(
        () => generateBoardReport(healthScore),
        [healthScore],
    );

    const captureRef  = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [copied,     setCopied]     = useState(false);

    // ── PDF generation via html2canvas + jsPDF ──────────────────────────────
    async function handleGeneratePDF() {
        if (generating || !captureRef.current) return;
        setGenerating(true);
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
            ]);

            const canvas = await html2canvas(captureRef.current, {
                scale:           2.5,
                useCORS:         true,
                backgroundColor: '#070910',
                logging:         false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf     = new jsPDF({
                orientation: 'portrait',
                unit:        'mm',
                format:      'a4',
            });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // Scale canvas to fit A4 width
            const imgW    = canvas.width;
            const imgH    = canvas.height;
            const ratio   = pageW / (imgW / 2.5 * (25.4 / 96));
            const printH  = (imgH / 2.5 * (25.4 / 96)) * ratio;

            // Multi-page if content overflows A4
            let y = 0;
            while (y < printH) {
                if (y > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, -y, pageW, printH);
                y += pageH;
            }

            pdf.save('THABAT-Capital-Report.pdf');
        } catch (err) {
            console.error('[ExportPortal] PDF generation failed:', err);
        } finally {
            setGenerating(false);
        }
    }

    // ── Copy investor link ──────────────────────────────────────────────────
    function handleCopyLink() {
        if (copied) return;
        const url = `${window.location.origin}/${locale}/investor`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
        });
    }

    return (
        <div className={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                className={s.panel}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            >
                {/* ── Top bar ──────────────────────────────────────────── */}
                <div className={s.topBar}>
                    <span className={s.topIcon}>📋</span>
                    <div style={{ flex: 1 }}>
                        <p className={s.topTitle}>{t('portalTitle')}</p>
                        <p className={s.topSub}>{t('portalSubtitle')}</p>
                    </div>
                    <button className={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* ── Body ─────────────────────────────────────────────── */}
                <div className={s.body}>

                    {/* Preview cards */}
                    <div>
                        <p className={s.previewLabel}>{t('previewLabel')}</p>
                        <div style={{ height: 8 }} />
                        <div className={s.previewRow}>

                            {/* Card 1: Executive Summary */}
                            <div className={s.previewCard}>
                                <div className={s.previewCardHdr} />
                                <p className={s.previewCardTitle}>{t('previewExec')}</p>
                                <p className={s.previewCardIcon}>📊</p>
                                <p className={s.previewKpi}>{report.healthScore}</p>
                                <div className={s.previewLines}>
                                    <div className={s.previewLine} />
                                    <div className={s.previewLine} />
                                    <div className={s.previewLine} />
                                </div>
                            </div>

                            {/* Card 2: Compliance */}
                            <div className={s.previewCard}>
                                <div className={s.previewCardHdr} />
                                <p className={s.previewCardTitle}>{t('previewCompliance')}</p>
                                <p className={s.previewCardIcon}>🛡</p>
                                <div className={s.previewTierDot} />
                                <div className={s.previewLines}>
                                    <div className={s.previewLine} />
                                    <div className={s.previewLine} />
                                    <div className={s.previewLine} />
                                </div>
                            </div>

                            {/* Card 3: Strategic Outlook */}
                            <div className={s.previewCard}>
                                <div className={s.previewCardHdr} />
                                <p className={s.previewCardTitle}>{t('previewStrategy')}</p>
                                <p className={s.previewCardIcon}>⚗</p>
                                {report.scenarioSnapshot && (
                                    <p className={s.previewKpi}>
                                        +{report.scenarioSnapshot.salesGrowthPct}%
                                    </p>
                                )}
                                <div className={s.previewLines}>
                                    <div className={s.previewLine} />
                                    <div className={s.previewLine} />
                                    <div className={s.previewLine} />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* KPI summary */}
                    <div className={s.summaryRow}>
                        <div className={s.summaryCell}>
                            <p className={s.summaryCellVal}>{report.healthScore}</p>
                            <p className={s.summaryCellLabel}>{t('kpiScore')}</p>
                        </div>
                        <div className={s.summaryCell}>
                            <p className={s.summaryCellVal}>
                                {report.totalValueProtected > 0
                                    ? `${(report.totalValueProtected / 1000).toFixed(0)}K`
                                    : '—'
                                }
                            </p>
                            <p className={s.summaryCellLabel}>{t('kpiProtected')}</p>
                        </div>
                        <div className={s.summaryCell}>
                            <p className={s.summaryCellVal}>
                                {report.realizedCount + report.pendingCount}
                            </p>
                            <p className={s.summaryCellLabel}>{t('kpiActions')}</p>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className={s.ctaArea}>
                        <button
                            className={s.generateBtn}
                            onClick={handleGeneratePDF}
                            disabled={generating}
                        >
                            {generating ? (
                                <>
                                    <span className={s.spinIcon}>⟳</span>
                                    {t('generatingBtn')}
                                </>
                            ) : (
                                <>
                                    <span className={s.generateIcon}>⬇</span>
                                    {t('generateBtn')}
                                </>
                            )}
                        </button>

                        <button
                            className={`${s.shareBtn} ${copied ? s.shareBtnCopied : ''}`}
                            onClick={handleCopyLink}
                        >
                            {copied ? `✓ ${t('sharedBtn')}` : `↗ ${t('shareBtn')}`}
                        </button>

                        <div className={s.investorLink}>
                            <span className={s.investorLinkText}>{t('investorLinkHint')}</span>
                            <a
                                href={`/${locale}/investor`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.investorLinkUrl}
                            >
                                {t('investorLinkLabel')} →
                            </a>
                        </div>
                    </div>

                </div>
            </motion.div>

            {/* ── Hidden capture target (off-screen) ───────────────── */}
            <div className={s.captureHost}>
                <ReportDocument ref={captureRef} report={report} />
            </div>
        </div>
    );
}
