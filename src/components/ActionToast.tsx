'use client';

/**
 * ActionToast — Phase 15: ActionBridge
 *
 * High-fidelity top-of-screen notification that appears when an executive
 * action is dispatched. Slides in from the top, auto-dismisses after 5 s.
 * Dark glass bar · green checkmark · "Executive Signal Dispatched."
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import type { ActionResult, ActionType } from '@/lib/executeActionBridge';
import s from './ActionToast.module.css';

interface ActionToastProps {
    result:    ActionResult | null;
    onDismiss: () => void;
}

// ── Action type decorators ─────────────────────────────────────────────────────
const TYPE_META: Record<ActionType, { icon: string; labelEn: string; labelAr: string }> = {
    EMAIL_OUTREACH:  { icon: '✉',  labelEn: 'Email',    labelAr: 'بريد' },
    WHATSAPP_SIGNAL: { icon: '⚡', labelEn: 'Signal',   labelAr: 'إشارة' },
    INTERNAL_TICKET: { icon: '◈',  labelEn: 'Ticket',   labelAr: 'تذكرة' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function ActionToast({ result, onDismiss }: ActionToastProps) {
    const locale = useLocale();
    const isAr   = locale === 'ar';

    // Auto-dismiss after 5 s
    useEffect(() => {
        if (!result) return;
        const id = setTimeout(onDismiss, 5000);
        return () => clearTimeout(id);
    }, [result, onDismiss]);

    const meta = result ? TYPE_META[result.type] : null;

    return (
        <AnimatePresence>
            {result && meta && (
                <motion.div
                    className={s.toast}
                    role="status"
                    aria-live="assertive"
                    initial={{ y: -72, opacity: 0 }}
                    animate={{ y: 0,   opacity: 1 }}
                    exit={{    y: -72, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={onDismiss}
                >
                    {/* Green success check */}
                    <span className={s.check} aria-hidden="true">✓</span>

                    {/* Action type icon + chip */}
                    <span className={s.typeChip}>
                        {meta.icon}&nbsp;{isAr ? meta.labelAr : meta.labelEn}
                    </span>

                    {/* Primary message */}
                    <div className={s.body}>
                        <span className={s.title}>
                            {isAr ? 'تم إرسال الإشارة التنفيذية' : 'Executive Signal Dispatched'}
                        </span>
                        <span className={s.ref}>{result.reference}</span>
                    </div>

                    {/* Dismiss hint */}
                    <span className={s.dimiss} aria-hidden="true">✕</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
