'use client';

import { useState, useRef, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatNumber, formatScore, toArabicDigits } from '@/lib/locale-utils';
import styles from './ExportButton.module.css';

export default function ExportButton() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const t = useTranslations('export');
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const fn = (v: number | string) => formatNumber(v, locale);
    const today = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    const handleExport = useCallback(async () => {
        if (exporting) return;
        setExporting(true);

        try {
            const reportEl = reportRef.current;
            if (!reportEl) return;

            // Make visible for capture
            reportEl.style.display = 'block';

            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(reportEl, {
                scale: 2,
                backgroundColor: '#050505',
                useCORS: true,
                logging: false,
                width: 595,
                windowWidth: 595,
            });

            reportEl.style.display = 'none';

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2],
            });

            pdf.addImage(
                canvas.toDataURL('image/png'),
                'PNG', 0, 0,
                canvas.width / 2,
                canvas.height / 2,
            );

            const filename = isAr
                ? `THABAT_تقرير_تنفيذي_${new Date().toISOString().slice(0, 10)}.pdf`
                : `THABAT_Executive_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;

            pdf.save(filename);
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setExporting(false);
        }
    }, [exporting, isAr]);

    return (
        <>
            <button
                className={styles.exportBtn}
                onClick={handleExport}
                disabled={exporting}
                title={t('title')}
            >
                {exporting ? (
                    <span className={styles.spinner} />
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                )}
            </button>

            {/* Hidden PDF Report Template */}
            <div
                ref={reportRef}
                className={styles.reportContainer}
                dir={isAr ? 'rtl' : 'ltr'}
                style={{ display: 'none' }}
            >
                {/* Header / Branding */}
                <div className={styles.reportHeader}>
                    <div className={styles.brandRow}>
                        <div className={styles.brandLeft}>
                            <span className={styles.brandLogo}>◆ THABAT</span>
                            <span className={styles.brandSub}>{t('subtitle')}</span>
                        </div>
                        <div className={styles.brandRight}>
                            <span className={styles.brandClient}>UNIMED</span>
                            <span className={styles.brandDate}>{today}</span>
                        </div>
                    </div>
                    <div className={styles.reportTitle}>{t('reportTitle')}</div>
                </div>

                {/* Stability Score */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>{t('stabilityScore')}</div>
                    <div className={styles.scoreRow}>
                        <div className={styles.scoreCircle}>
                            <span className={styles.scoreNum}>{fn(87)}</span>
                        </div>
                        <div className={styles.scoreInfo}>
                            <span className={styles.scoreTrend}>↗ {t('strengthening')}</span>
                            <span className={styles.scoreDesc}>{t('scoreDesc')}</span>
                        </div>
                    </div>
                    <div className={styles.kpiGrid}>
                        <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>{t('revenueGrowth')}</span>
                            <span className={styles.kpiValue}>{fn(12.4)}%</span>
                        </div>
                        <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>{t('clientRetention')}</span>
                            <span className={styles.kpiValue}>{fn(94.2)}%</span>
                        </div>
                        <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>{t('opEfficiency')}</span>
                            <span className={styles.kpiValue}>{fn(88.7)}%</span>
                        </div>
                    </div>
                </div>

                {/* Velocity & Order-to-Cash */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>{t('velocityTitle')}</div>
                    <div className={styles.velocityRow}>
                        <div className={styles.velocityMain}>
                            <span className={styles.velocityNum}>{fn(142)}</span>
                            <span className={styles.velocityUnit}>{t('days')}</span>
                        </div>
                        <div className={styles.velocityMeta}>
                            <span>{t('sectorAvg')}: {fn(160)} {t('days')}</span>
                            <span className={styles.velocityGood}>↗ {fn(11.3)}% {t('faster')}</span>
                        </div>
                    </div>
                </div>

                {/* Contract Stability */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>{t('contractTitle')}</div>
                    <table className={styles.contractTable}>
                        <thead>
                            <tr>
                                <th>{t('client')}</th>
                                <th>{t('value')}</th>
                                <th>{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{isAr ? 'نوبكو – اتفاقية إطارية' : 'NUPCO – Framework Agreement'}</td>
                                <td>{isAr ? 'ر.س' : 'SAR'} {fn('1,053,000.00')}</td>
                                <td className={styles.statusStable}>{isAr ? 'مستقر للغاية' : 'Highly Stable'}</td>
                            </tr>
                            <tr>
                                <td>{isAr ? 'وزارة الصحة – شراء مباشر' : 'MOH – Direct Purchase'}</td>
                                <td>{isAr ? 'ر.س' : 'SAR'} {fn('2,100,000.00')}</td>
                                <td className={styles.statusStable}>{isAr ? 'مستقر للغاية' : 'Highly Stable'}</td>
                            </tr>
                            <tr>
                                <td>{isAr ? 'مستشفى الملك فيصل التخصصي' : 'King Faisal Specialist Hospital'}</td>
                                <td>{isAr ? 'ر.س' : 'SAR'} {fn('1,350,000.00')}</td>
                                <td className={styles.statusAlert}>{isAr ? 'يتطلب تجديد' : 'Renewal Required'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Executive Action Log */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>{t('actionLog')}</div>
                    <div className={styles.logList}>
                        <div className={styles.logItem}>
                            <span className={styles.logDot} />
                            <span>{isAr
                                ? `أمر الشراء ${toArabicDigits('4600100323')} – تمت الموافقة من الرئيس التنفيذي بتاريخ ${toArabicDigits('03/03/2026')}`
                                : 'PO 4600100323 – Approved by CEO on 03/03/2026'
                            }</span>
                        </div>
                        <div className={styles.logItem}>
                            <span className={styles.logDot} />
                            <span>{isAr
                                ? `ملخص تجديد عقد مستشفى الملك فيصل التخصصي – مطلوب خلال ${toArabicDigits('72')} يومًا`
                                : 'KFSH Renewal Brief – Requested (72 days remaining)'
                            }</span>
                        </div>
                        <div className={styles.logItem}>
                            <span className={styles.logDot} />
                            <span>{isAr
                                ? `إعادة توريد القسطرة البولية – تم الاعتماد (ر.س ${toArabicDigits('7,312.50')})`
                                : 'Catheter Restock PO – Approved (SAR 7,312.50)'
                            }</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.reportFooter}>
                    <span>{t('footerConfidential')}</span>
                    <span>{t('footerGenerated')} {today}</span>
                </div>
            </div>
        </>
    );
}
