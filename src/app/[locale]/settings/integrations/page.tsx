'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import PageHeader from '@/components/PageHeader';
import MetricsEntry from '@/components/MetricsEntry';
import Shell from '@/components/Shell';
import styles from './page.module.css';

export default function DataEntryPage() {
    const locale = useLocale();
    const isAr = locale === 'ar';
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [lastScore, setLastScore] = useState<number | null>(null);

    const handleSubmit = async (data: {
        date: string;
        cash: number;
        revenue: number;
        expenses: number;
        receivables: number;
        payables: number;
    }): Promise<boolean> => {
        setLoading(true);
        setSubmitError(null);
        setLastScore(null);
        try {
            const res = await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const body = await res.json();
            if (!res.ok) {
                setSubmitError(body.error ?? (isAr ? 'فشل الإرسال' : 'Submission failed'));
                return false;
            }
            if (body.score?.overall !== undefined) {
                setLastScore(Math.round(body.score.overall));
            }
            return true;
        } catch {
            setSubmitError(isAr ? 'خطأ في الشبكة — يرجى المحاولة مجدداً' : 'Network error — please try again');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return (
        <Shell>
            <div className={styles.page}>
                <PageHeader
                    title={isAr ? 'إدخال البيانات' : 'Manual Data Entry'}
                    subtitle={isAr ? 'أدخل المقاييس المالية يدوياً' : 'Enter financial metrics manually'}
                />

                {submitError && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        fontSize: 13, color: 'var(--danger)',
                    }}>
                        ✗ {submitError}
                    </div>
                )}

                {lastScore !== null && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                        fontSize: 13, color: 'var(--success)',
                    }}>
                        {isAr
                            ? `✓ تم الحفظ — درجة الاستقرار الجديدة: ${lastScore}`
                            : `✓ Saved — new stability score: ${lastScore}`}
                    </div>
                )}

                <MetricsEntry onSubmit={handleSubmit} loading={loading} />
            </div>
        </Shell>
    );
}
