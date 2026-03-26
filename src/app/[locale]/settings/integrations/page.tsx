'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import PageHeader from '@/components/PageHeader';
import MetricsEntry from '@/components/MetricsEntry';
import Shell from '@/components/Shell';
import styles from './page.module.css';

export default function DataEntryPage() {
    const locale = useLocale();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: {
        date: string;
        cash: number;
        revenue: number;
        expenses: number;
        receivables: number;
        payables: number;
    }) => {
        setLoading(true);
        try {
            await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        } catch (err) {
            console.error('Failed to submit metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Shell>
            <div className={styles.page}>
                <PageHeader
                    title={locale === 'ar' ? 'إدخال البيانات' : 'Manual Data Entry'}
                    subtitle={locale === 'ar' ? 'أدخل المقاييس المالية يدوياً' : 'Enter financial metrics manually'}
                />
                <MetricsEntry onSubmit={handleSubmit} loading={loading} />
            </div>
        </Shell>
    );
}
