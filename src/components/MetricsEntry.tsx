'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import styles from './entry.module.css';

interface MetricsEntryProps {
    onSubmit: (data: MetricsData) => Promise<void>;
    loading: boolean;
}

interface MetricsData {
    date: string;
    cash: number;
    revenue: number;
    expenses: number;
    receivables: number;
    payables: number;
}

export default function MetricsEntry({ onSubmit, loading }: MetricsEntryProps) {
    const t = useTranslations('entry');
    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState<MetricsData>({
        date: today,
        cash: 0,
        revenue: 0,
        expenses: 0,
        receivables: 0,
        payables: 0,
    });
    const [success, setSuccess] = useState(false);

    const update = (key: keyof MetricsData, value: string) => {
        setForm(prev => ({
            ...prev,
            [key]: key === 'date' ? value : parseFloat(value) || 0,
        }));
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(form);
        setSuccess(true);
    };

    const fields = [
        { key: 'cash' as const, icon: '💰', color: 'var(--accent-primary)', placeholder: '8,500,000' },
        { key: 'revenue' as const, icon: '📈', color: 'var(--success)', placeholder: '12,000,000' },
        { key: 'expenses' as const, icon: '📉', color: 'var(--danger)', placeholder: '9,800,000' },
        { key: 'receivables' as const, icon: '📋', color: 'var(--warning)', placeholder: '14,500,000' },
        { key: 'payables' as const, icon: '📤', color: 'var(--text-tertiary)', placeholder: '6,200,000' },
    ];

    return (
        <motion.form
            onSubmit={handleSubmit}
            className={styles.form}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Date Field */}
            <div className={`glass-card ${styles.dateCard}`}>
                <label className={styles.dateLabel}>{t('date')}</label>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={form.date}
                    onChange={(e) => update('date', e.target.value)}
                    max={today}
                    required
                />
            </div>

            {/* Metric Fields */}
            <div className={styles.grid}>
                {fields.map((field, i) => (
                    <motion.div
                        key={field.key}
                        className={`glass-card ${styles.metricCard}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                    >
                        <div className={styles.metricHeader}>
                            <span className={styles.metricIcon} style={{ color: field.color }}>
                                {field.icon}
                            </span>
                            <label className={styles.metricLabel}>{t(field.key)}</label>
                        </div>
                        <div className={styles.inputWrapper}>
                            <span className={styles.currency}>SAR</span>
                            <input
                                type="number"
                                className={styles.metricInput}
                                value={form[field.key] || ''}
                                onChange={(e) => update(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Success Message */}
            {success && (
                <motion.div
                    className={styles.success}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    ✓ {t('success')}
                </motion.div>
            )}

            {/* Submit */}
            <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
            >
                {loading ? t('calculating') : t('submit')}
            </button>
        </motion.form>
    );
}
