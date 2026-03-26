'use client';

/**
 * VocalResponseOverlay — Phase 13: Intent Engine
 *
 * Bottom-aligned translucent bar that surfaces the Oracle's spoken answer
 * in large readable text with a typewriter character-reveal matching the
 * Oracle brand. Auto-dismisses after the full text is shown.
 * Tap anywhere on it to dismiss immediately.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceIntent } from '@/lib/processVoiceIntent';
import s from './VocalResponseOverlay.module.css';

interface VocalResponseOverlayProps {
    text:      string | null;
    intent:    VoiceIntent | null;
    onDismiss: () => void;
}

// ── Intent accent colours ──────────────────────────────────────────────────────
const INTENT_COLOR: Record<string, string> = {
    FINANCIAL_HEALTH:     '#4ADE80',   // emerald
    COMPLIANCE_STATUS:    '#818CF8',   // indigo
    OPERATIONAL_FRICTION: '#F87171',   // red
    RETENTION_RISK:       '#F59E0B',   // amber
    UNKNOWN:              '#94A3B8',   // slate
};

// ── Typewriter hook ────────────────────────────────────────────────────────────
function useTypewriter(text: string | null, speed = 28): string {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        if (!text) { setDisplayed(''); return; }
        setDisplayed('');
        let i = 0;
        const id = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);

    return displayed;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VocalResponseOverlay({
    text,
    intent,
    onDismiss,
}: VocalResponseOverlayProps) {
    const displayed = useTypewriter(text);
    const accentColor = intent ? (INTENT_COLOR[intent] ?? INTENT_COLOR.UNKNOWN) : '#94A3B8';

    // Auto-dismiss 3 s after text is fully revealed
    useEffect(() => {
        if (!text || displayed.length < text.length) return;
        const id = setTimeout(onDismiss, 3000);
        return () => clearTimeout(id);
    }, [displayed, text, onDismiss]);

    return (
        <AnimatePresence>
            {text && (
                <motion.div
                    className={s.overlay}
                    role="status"
                    aria-live="polite"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0,      opacity: 1 }}
                    exit={{    y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                    onClick={onDismiss}
                    style={{ '--accent': accentColor } as React.CSSProperties}
                >
                    {/* Top accent line */}
                    <span className={s.accentLine} style={{ background: accentColor }} />

                    {/* Intent badge */}
                    {intent && intent !== 'UNKNOWN' && (
                        <span className={s.badge} style={{ color: accentColor, borderColor: `${accentColor}33` }}>
                            {{
                                FINANCIAL_HEALTH:     '◈ Financial',
                                COMPLIANCE_STATUS:    '◈ Compliance',
                                OPERATIONAL_FRICTION: '◈ Operations',
                                RETENTION_RISK:       '◈ Retention',
                            }[intent]}
                        </span>
                    )}

                    {/* Response text with typewriter reveal */}
                    <p className={s.text}>
                        {displayed}
                        {displayed.length < (text?.length ?? 0) && (
                            <span className={s.cursor} aria-hidden="true" />
                        )}
                    </p>

                    <span className={s.dismiss}>tap to dismiss</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
