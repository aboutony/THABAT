'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatNumber, toArabicDigits } from '@/lib/locale-utils';
import styles from './ExportButton.module.css';

export default function ExportButton() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const t = useTranslations('export');
    const [exporting, setExporting] = useState(false);

    const fn = (v: number | string) => formatNumber(v, locale);
    const today = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    const handleExport = useCallback(async () => {
        if (exporting) return;
        setExporting(true);

        try {
            const printWindow = window.open('', '_blank', 'width=800,height=1100');
            if (!printWindow) {
                alert('Please allow popups to export the PDF.');
                return;
            }

            const dir = isAr ? 'rtl' : 'ltr';
            const fontFamily = isAr
                ? "'Segoe UI', 'Arial', 'Tahoma', sans-serif"
                : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

            // Contract rows
            const contracts = [
                {
                    client: isAr ? 'نوبكو – اتفاقية إطارية' : 'NUPCO – Framework Agreement',
                    value: `${isAr ? 'ر.س' : 'SAR'} ${fn('1,053,000.00')}`,
                    status: isAr ? 'مستقر للغاية' : 'Highly Stable',
                    color: '#006C35',
                },
                {
                    client: isAr ? 'وزارة الصحة – شراء مباشر' : 'MOH – Direct Purchase',
                    value: `${isAr ? 'ر.س' : 'SAR'} ${fn('2,100,000.00')}`,
                    status: isAr ? 'مستقر للغاية' : 'Highly Stable',
                    color: '#006C35',
                },
                {
                    client: isAr ? 'مستشفى الملك فيصل التخصصي' : 'King Faisal Specialist Hospital',
                    value: `${isAr ? 'ر.س' : 'SAR'} ${fn('1,350,000.00')}`,
                    status: isAr ? 'يتطلب تجديد' : 'Renewal Required',
                    color: '#F59E0B',
                },
            ];

            // Action log entries
            const actions = [
                isAr
                    ? `أمر الشراء ${toArabicDigits('4600100323')} – تمت الموافقة من الرئيس التنفيذي بتاريخ ${toArabicDigits('03/03/2026')}`
                    : 'PO 4600100323 – Approved by CEO on 03/03/2026',
                isAr
                    ? `ملخص تجديد عقد مستشفى الملك فيصل التخصصي – مطلوب خلال ${toArabicDigits('72')} يومًا`
                    : 'KFSH Renewal Brief – Requested (72 days remaining)',
                isAr
                    ? `إعادة توريد القسطرة البولية – تم الاعتماد (ر.س ${toArabicDigits('7,312.50')})`
                    : 'Catheter Restock PO – Approved (SAR 7,312.50)',
            ];

            const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
<head>
<meta charset="UTF-8">
<title>${t('reportTitle')} - THABAT</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: ${isAr ? "'Noto Sans Arabic'," : ''} ${fontFamily};
    background: #050505;
    color: #E0E0E0;
    padding: 40px;
    font-size: 13px;
    line-height: 1.6;
    direction: ${dir};
}
@media print {
    body { background: #050505; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0.5in; size: A4; }
}

.header { margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid rgba(0,108,53,0.4); }
.brand-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
.brand-logo { font-size: 22px; font-weight: 700; color: #E0E0E0; letter-spacing: 0.15em; }
.brand-sub { display: block; font-size: 10px; color: rgba(192,192,192,0.6); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
.brand-client { font-size: 16px; font-weight: 700; color: #006C35; }
.brand-date { display: block; font-size: 11px; color: rgba(192,192,192,0.5); margin-top: 2px; }
.report-title { font-size: 20px; font-weight: 700; color: #E0E0E0; text-align: center; letter-spacing: 0.04em; }

.section { margin-bottom: 22px; padding: 18px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
.section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(192,192,192,0.6); margin-bottom: 14px; }

.score-row { display: flex; align-items: center; gap: 22px; margin-bottom: 18px; }
.score-circle { width: 76px; height: 76px; border-radius: 50%; border: 4px solid #006C35; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(0,108,53,0.3); flex-shrink: 0; }
.score-num { font-size: 30px; font-weight: 700; color: #006C35; }
.score-trend { font-size: 16px; font-weight: 600; color: #006C35; }
.score-desc { font-size: 12px; color: rgba(192,192,192,0.6); margin-top: 4px; }

.kpi-grid { display: flex; gap: 14px; }
.kpi-item { flex: 1; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; text-align: center; }
.kpi-label { display: block; font-size: 10px; color: rgba(192,192,192,0.5); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.kpi-value { font-size: 20px; font-weight: 700; color: #E0E0E0; }

.velocity-row { display: flex; align-items: center; gap: 28px; }
.velocity-num { font-size: 42px; font-weight: 700; color: #006C35; text-shadow: 0 0 14px rgba(0,108,53,0.3); }
.velocity-unit { font-size: 14px; color: rgba(192,192,192,0.5); text-transform: uppercase; margin-inline-start: 6px; }
.velocity-meta { font-size: 12px; color: rgba(192,192,192,0.5); }
.velocity-good { color: #006C35; font-weight: 600; display: block; margin-top: 2px; }

table { width: 100%; border-collapse: collapse; }
th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(192,192,192,0.5); text-align: start; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
td { font-size: 12px; color: #E0E0E0; padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); }

.log-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 12px; color: rgba(224,224,224,0.8); }
.log-dot { width: 7px; height: 7px; border-radius: 50%; background: #006C35; margin-top: 6px; flex-shrink: 0; }

.footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 9px; color: rgba(192,192,192,0.4); text-transform: uppercase; letter-spacing: 0.06em; }
</style>
</head>
<body>
<div class="header">
    <div class="brand-row">
        <div>
            <span class="brand-logo">◆ THABAT</span>
            <span class="brand-sub">${t('subtitle')}</span>
        </div>
        <div style="text-align:${isAr ? 'start' : 'end'}">
            <span class="brand-client">UNIMED</span>
            <span class="brand-date">${today}</span>
        </div>
    </div>
    <div class="report-title">${t('reportTitle')}</div>
</div>

<div class="section">
    <div class="section-label">${t('stabilityScore')}</div>
    <div class="score-row">
        <div class="score-circle"><span class="score-num">${fn(87)}</span></div>
        <div>
            <div class="score-trend">↗ ${t('strengthening')}</div>
            <div class="score-desc">${t('scoreDesc')}</div>
        </div>
    </div>
    <div class="kpi-grid">
        <div class="kpi-item">
            <span class="kpi-label">${t('revenueGrowth')}</span>
            <span class="kpi-value">${fn(12.4)}%</span>
        </div>
        <div class="kpi-item">
            <span class="kpi-label">${t('clientRetention')}</span>
            <span class="kpi-value">${fn(94.2)}%</span>
        </div>
        <div class="kpi-item">
            <span class="kpi-label">${t('opEfficiency')}</span>
            <span class="kpi-value">${fn(88.7)}%</span>
        </div>
    </div>
</div>

<div class="section">
    <div class="section-label">${t('velocityTitle')}</div>
    <div class="velocity-row">
        <div>
            <span class="velocity-num">${fn(142)}</span>
            <span class="velocity-unit">${t('days')}</span>
        </div>
        <div class="velocity-meta">
            ${t('sectorAvg')}: ${fn(160)} ${t('days')}
            <span class="velocity-good">↗ ${fn(11.3)}% ${t('faster')}</span>
        </div>
    </div>
</div>

<div class="section">
    <div class="section-label">${t('contractTitle')}</div>
    <table>
        <thead><tr>
            <th>${t('client')}</th>
            <th>${t('value')}</th>
            <th>${t('status')}</th>
        </tr></thead>
        <tbody>
            ${contracts.map(c => `<tr>
                <td>${c.client}</td>
                <td>${c.value}</td>
                <td style="color:${c.color};font-weight:600">${c.status}</td>
            </tr>`).join('')}
        </tbody>
    </table>
</div>

<div class="section">
    <div class="section-label">${t('actionLog')}</div>
    ${actions.map(a => `<div class="log-item">
        <span class="log-dot"></span>
        <span>${a}</span>
    </div>`).join('')}
</div>

<div class="footer">
    <span>${t('footerConfidential')}</span>
    <span>${t('footerGenerated')} ${today}</span>
</div>

<script>
    // Wait for fonts to load, then print
    document.fonts.ready.then(() => {
        setTimeout(() => { window.print(); }, 500);
    });
</script>
</body>
</html>`;

            printWindow.document.write(html);
            printWindow.document.close();
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setTimeout(() => setExporting(false), 1000);
        }
    }, [exporting, isAr, locale, t, fn, today]);

    return (
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
    );
}
