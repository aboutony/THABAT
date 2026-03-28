'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

import Shell from '@/components/Shell';
import LeadTimePulse from '@/components/LeadTimePulse';
import SupplierCard from '@/components/SupplierCard';
import { DEMO_SUPPLIERS } from '@/lib/calculateTrustScore';
import { useIdentity } from '@/hooks/useIdentity';

import s from './supply-chain.module.css';

// ── Demo shipment data (UNIMED context) ───────────────────────────────────────
const SHIPMENTS = [
    {
        id:     'SHP-2841',
        product: 'Ultrasound Probe Array',
        productAr: 'مجموعة مسابير الموجات الفوق صوتية',
        origin:  'Hamburg, DE',
        dest:    'Riyadh',
        destAr:  'الرياض',
        day:     18,
        status:  'transit' as const,
    },
    {
        id:     'SHP-2840',
        product: 'MRI Contrast Agent',
        productAr: 'عامل تباين الرنين المغناطيسي',
        origin:  'Shanghai, CN',
        dest:    'Jeddah',
        destAr:  'جدة',
        day:     7,
        status:  'customs' as const,
    },
    {
        id:     'SHP-2838',
        product: 'Surgical Instrument Set',
        productAr: 'طقم أدوات جراحية',
        origin:  'Boston, MA',
        dest:    'Jeddah',
        destAr:  'جدة',
        day:     29,
        status:  'delivered' as const,
    },
    {
        id:     'SHP-2836',
        product: 'Lab Analyzer Cartridges',
        productAr: 'خراطيش محلل مختبري',
        origin:  'Stuttgart, DE',
        dest:    'Riyadh',
        destAr:  'الرياض',
        day:     3,
        status:  'transit' as const,
    },
] as const;

const STATUS_LABEL_EN: Record<typeof SHIPMENTS[number]['status'], string> = {
    transit:   'In Transit',
    customs:   'At Customs',
    delivered: 'Delivered',
};
const STATUS_LABEL_AR: Record<typeof SHIPMENTS[number]['status'], string> = {
    transit:   'في الطريق',
    customs:   'في الجمارك',
    delivered: 'تم التسليم',
};

// ── KPI summaries ─────────────────────────────────────────────────────────────
const KPI_AVG_LEAD  = 14.8;
const KPI_ON_TIME   = 73;
const KPI_FRICTION  = 8;
const KPI_ACTIVE    = 4;

// ── Stagger helper ────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 12 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.4, delay },
});

export default function SupplyChainPage() {
    const locale = useLocale();
    const isAr   = locale === 'ar';
    const t      = useTranslations('supplyChain');
    const { isClient } = useIdentity();

    return (
        <Shell>
            <div className={s.page}>

                {/* Back link */}
                <Link href={`/${locale}/analytics`} className={s.backLink}>
                    {isAr ? '←' : '→'}&nbsp;{t('back')}
                </Link>

                {/* Header */}
                <div className={s.header}>
                    <h2 className={s.title}>{t('title')}</h2>
                    <p className={s.subtitle}>{t('subtitle')}</p>
                </div>

                {/* ── CLIENT ghost state ─────────────────────────────────── */}
                {isClient && (
                    <motion.div
                        {...fadeUp(0.05)}
                        className={`glass-card ${s.card}`}
                        style={{ textAlign: 'center', padding: '48px 24px' }}
                    >
                        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.25 }}>📦</div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(148,163,184,0.5)', marginBottom: 6 }}>
                            {isAr ? 'بيانات الخدمات اللوجستية: غير متصلة' : 'Logistics Data: Offline'}
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.3)', lineHeight: 1.6 }}>
                            {isAr
                                ? 'يتطلب ربط نظام ERP لتفعيل تتبع الشحنات في الوقت الفعلي.'
                                : 'Requires ERP integration to activate real-time shipment tracking.'}
                        </p>
                    </motion.div>
                )}

                {/* ── Live content (non-CLIENT only) ────────────────────── */}
                {!isClient && (<>

                {/* ── Hero: LeadTimePulse ────────────────────────────────── */}
                <motion.div {...fadeUp(0.05)} className={`glass-card ${s.card}`}>
                    <div>
                        <p className={s.cardTitle}>{t('pulseTitle')}</p>
                        <p className={s.cardSubtitle}>{t('pulseSubtitle')}</p>
                    </div>
                    <LeadTimePulse
                        currentDay={18}
                        isAr={isAr}
                        shipmentCount={KPI_ACTIVE}
                    />
                </motion.div>

                {/* ── KPI tiles ─────────────────────────────────────────── */}
                <motion.div {...fadeUp(0.12)} className={s.kpiGrid}>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${s.neutral}`}>
                            {KPI_AVG_LEAD}
                            <span className={s.kpiSuffix}>{t('days')}</span>
                        </span>
                        <span className={s.kpiLabel}>{t('avgLeadTime')}</span>
                    </div>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${KPI_ON_TIME >= 85 ? s.success : s.warning}`}>
                            {KPI_ON_TIME}
                            <span className={s.kpiSuffix}>%</span>
                        </span>
                        <span className={s.kpiLabel}>{t('onTimeRate')}</span>
                    </div>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${s.warning}`}>
                            {KPI_FRICTION}
                            <span className={s.kpiSuffix}>{t('days')}</span>
                        </span>
                        <span className={s.kpiLabel}>{t('frictionDays')}</span>
                    </div>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${s.indigo}`}>
                            {KPI_ACTIVE}
                        </span>
                        <span className={s.kpiLabel}>{t('activeShipments')}</span>
                    </div>

                </motion.div>

                {/* ── Live shipments list ────────────────────────────────── */}
                <motion.div {...fadeUp(0.18)} className={`glass-card ${s.card}`}>
                    <p className={s.cardTitle}>{t('shipmentsTitle')}</p>
                    <div className={s.shipList}>
                        {SHIPMENTS.map((ship, i) => (
                            <motion.div
                                key={ship.id}
                                className={s.shipRow}
                                initial={{ opacity: 0, x: isAr ? 8 : -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.22 + i * 0.06 }}
                            >
                                {/* Status indicator dot */}
                                <span className={`${s.shipStatus} ${s[ship.status]}`} />

                                {/* Body */}
                                <div className={s.shipBody}>
                                    <span className={s.shipId}>{ship.id}</span>
                                    <span className={s.shipMeta}>
                                        {isAr ? ship.productAr : ship.product}
                                        {' · '}
                                        {ship.origin}
                                        {' → '}
                                        {isAr ? ship.destAr : ship.dest}
                                    </span>
                                </div>

                                {/* Right: day count + status pill stacked */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                    <span className={s.shipDay}>
                                        {isAr ? `ي${ship.day}` : `D${ship.day}`}
                                    </span>
                                    <span className={`${s.statusPill} ${s[ship.status]}`}>
                                        {isAr
                                            ? STATUS_LABEL_AR[ship.status]
                                            : STATUS_LABEL_EN[ship.status]}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Supplier Intelligence ─────────────────────────────── */}
                <motion.div {...fadeUp(0.28)} className={`glass-card ${s.card}`}>
                    <div>
                        <p className={s.cardTitle}>{t('suppliersTitle')}</p>
                        <p className={s.cardSubtitle}>{t('suppliersSubtitle')}</p>
                    </div>
                    <div className={s.supplierList}>
                        {DEMO_SUPPLIERS.map((sup, i) => (
                            <motion.div
                                key={sup.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.32 + i * 0.07 }}
                            >
                                <SupplierCard supplier={sup} isAr={isAr} />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Risk signals ───────────────────────────────────────── */}
                <motion.div {...fadeUp(0.26)} className={`glass-card ${s.card}`}>
                    <p className={s.cardTitle}>{t('riskTitle')}</p>
                    <div className={s.alertList}>
                        <div className={`${s.alertRow} ${s.warn}`}>
                            <span className={s.alertIcon}>⚠</span>
                            <span>{t('riskCustoms')}</span>
                        </div>
                        <div className={`${s.alertRow} ${s.info}`}>
                            <span className={s.alertIcon}>ℹ</span>
                            <span>{t('riskPort')}</span>
                        </div>
                    </div>
                </motion.div>

                </>)}

            </div>
        </Shell>
    );
}
