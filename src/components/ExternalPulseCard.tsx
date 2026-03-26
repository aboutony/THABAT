'use client';

/**
 * ExternalPulseCard — Phase 14: RealitySeed
 *
 * High-density, minimalist card displaying the external macro-intelligence
 * feed for the Executive Vault. Uses Sovereign Gold (#D4AF37) as the accent
 * to visually distinguish external data from internal risk warnings.
 */

import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { fetchExternalPulse } from '@/lib/fetchExternalPulse';
import type { ExternalPulse, PulseSeverity } from '@/lib/fetchExternalPulse';
import s from './ExternalPulseCard.module.css';

// ── Severity config ────────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<PulseSeverity, { en: string; ar: string }> = {
    alert: { en: 'Alert',  ar: 'تنبيه'  },
    watch: { en: 'Watch',  ar: 'مراقبة' },
    info:  { en: 'Info',   ar: 'معلومة' },
};

const CATEGORY_ICON: Record<string, string> = {
    regulatory: '⚖',
    market:     '📈',
    local:      '🏛',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function ExternalPulseCard() {
    const locale = useLocale();
    const isAr   = locale === 'ar';
    const pulses = fetchExternalPulse();

    return (
        <div className={s.card}>
            {/* Header */}
            <div className={s.header}>
                <span className={s.globeIcon}>🌐</span>
                <span className={s.title}>
                    {isAr ? 'النبضة الخارجية' : 'External Pulse'}
                </span>
                <span className={s.sourceTag}>
                    {isAr ? 'بيانات خارجية' : 'Macro Intel'}
                </span>
            </div>

            {/* Pulse items */}
            <div className={s.list}>
                {pulses.map((pulse, i) => (
                    <motion.div
                        key={pulse.id}
                        className={`${s.item} ${s[`item_${pulse.severity}`]}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                    >
                        {/* Left col */}
                        <div className={s.itemLeft}>
                            <span className={s.categoryIcon}>
                                {CATEGORY_ICON[pulse.category]}
                            </span>
                            {pulse.isNew && <span className={s.newDot} />}
                        </div>

                        {/* Body */}
                        <div className={s.itemBody}>
                            <div className={s.itemMeta}>
                                <span className={s.itemSource}>
                                    {isAr ? pulse.sourceAr : pulse.sourceEn}
                                </span>
                                <span className={`${s.itemSeverity} ${s[`severity_${pulse.severity}`]}`}>
                                    {isAr
                                        ? SEVERITY_LABEL[pulse.severity].ar
                                        : SEVERITY_LABEL[pulse.severity].en}
                                </span>
                                <span className={s.itemDate}>{pulse.timestamp}</span>
                            </div>

                            <p className={s.itemHeadline}>
                                {isAr ? pulse.headlineAr : pulse.headlineEn}
                            </p>

                            <p className={s.itemBody2}>
                                {isAr ? pulse.bodyAr : pulse.bodyEn}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Footer */}
            <div className={s.footer}>
                <span className={s.footerDot} />
                <span className={s.footerText}>
                    {isAr
                        ? 'يُحدَّث تلقائياً · بيانات تجريبية'
                        : 'Auto-updated · Demo data'}
                </span>
            </div>
        </div>
    );
}
