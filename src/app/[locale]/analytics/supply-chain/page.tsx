'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

import Shell from '@/components/Shell';
import ErrorBoundary from '@/components/ErrorBoundary';
import LeadTimePulse from '@/components/LeadTimePulse';
import SupplierCard from '@/components/SupplierCard';
import { getEntitySuppliers } from '@/lib/calculateTrustScore';
import { getEntitySupplyChainContent } from '@/lib/entityDemoContent';
import { useIdentity } from '@/hooks/useIdentity';
import { useEntity } from '@/context/EntityContext';

import s from './supply-chain.module.css';

const STATUS_LABEL_EN: Record<'transit' | 'customs' | 'delivered', string> = {
    transit:   'In Transit',
    customs:   'At Customs',
    delivered: 'Delivered',
};
const STATUS_LABEL_AR: Record<'transit' | 'customs' | 'delivered', string> = {
    transit:   'في الطريق',
    customs:   'في الجمارك',
    delivered: 'تم التسليم',
};

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
    const { activeEntity } = useEntity();
    const content = getEntitySupplyChainContent(activeEntity.id);
    const suppliers = getEntitySuppliers(activeEntity.id);

    return (
        <Shell>
            <ErrorBoundary section="Supply Chain">
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
                        currentDay={content.currentDay}
                        isAr={isAr}
                        shipmentCount={content.kpis.activeShipments}
                    />
                </motion.div>

                {/* ── KPI tiles ─────────────────────────────────────────── */}
                <motion.div {...fadeUp(0.12)} className={s.kpiGrid}>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${s.neutral}`}>
                            {content.kpis.avgLeadTime}
                            <span className={s.kpiSuffix}>{t('days')}</span>
                        </span>
                        <span className={s.kpiLabel}>{t('avgLeadTime')}</span>
                    </div>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${content.kpis.onTime >= 85 ? s.success : s.warning}`}>
                            {content.kpis.onTime}
                            <span className={s.kpiSuffix}>%</span>
                        </span>
                        <span className={s.kpiLabel}>{t('onTimeRate')}</span>
                    </div>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${s.warning}`}>
                            {content.kpis.friction}
                            <span className={s.kpiSuffix}>{t('days')}</span>
                        </span>
                        <span className={s.kpiLabel}>{t('frictionDays')}</span>
                    </div>

                    <div className={`glass-card ${s.kpiTile}`}>
                        <span className={`${s.kpiNum} ${s.indigo}`}>
                            {content.kpis.activeShipments}
                        </span>
                        <span className={s.kpiLabel}>{t('activeShipments')}</span>
                    </div>

                </motion.div>

                {/* ── Live shipments list ────────────────────────────────── */}
                <motion.div {...fadeUp(0.18)} className={`glass-card ${s.card}`}>
                    <p className={s.cardTitle}>{t('shipmentsTitle')}</p>
                    <div className={s.shipList}>
                        {content.shipments.map((ship, i) => (
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
                                        {isAr ? ship.product.ar : ship.product.en}
                                        {' · '}
                                        {ship.origin}
                                        {' → '}
                                        {isAr ? ship.destination.ar : ship.destination.en}
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
                        {suppliers.map((sup, i) => (
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
                        {content.riskSignals.map((signal, index) => (
                            <div
                                key={index}
                                className={`${s.alertRow} ${signal.tone === 'warn' ? s.warn : s.info}`}
                            >
                                <span className={s.alertIcon}>{signal.tone === 'warn' ? '⚠' : 'ℹ'}</span>
                                <span>{isAr ? signal.text.ar : signal.text.en}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                </>)}

            </div>
            </ErrorBoundary>
        </Shell>
    );
}
