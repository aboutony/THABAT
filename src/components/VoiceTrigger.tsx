'use client';

/**
 * VoiceTrigger — Phase 13: Voice Foundation
 *
 * Small glowing microphone button rendered in the Oracle Briefing header.
 * Pulses violet when the mic is active. Hidden automatically when the
 * Web SpeechRecognition API is not supported by the browser.
 */

import { motion } from 'framer-motion';
import s from './VoiceTrigger.module.css';

interface VoiceTriggerProps {
    listening: boolean;
    supported: boolean;
    onToggle:  () => void;
    /** Passed through for accessible labelling */
    isAr?:     boolean;
}

export default function VoiceTrigger({ listening, supported, onToggle, isAr }: VoiceTriggerProps) {
    if (!supported) return null;

    return (
        <motion.button
            className={`${s.btn} ${listening ? s.active : ''}`}
            onClick={onToggle}
            aria-label={
                listening
                    ? (isAr ? 'إيقاف الاستماع' : 'Stop listening')
                    : (isAr ? 'اسأل الأوراكل' : 'Ask Oracle')
            }
            aria-pressed={listening}
            whileTap={{ scale: 0.86 }}
            title={listening ? (isAr ? 'جارٍ الاستماع…' : 'Listening…') : (isAr ? 'اسأل الأوراكل' : 'Ask Oracle')}
        >
            {/* Expanding violet halo when active */}
            {listening && (
                <motion.span
                    className={s.glowRing}
                    animate={{ scale: [1, 1.55, 1], opacity: [0.55, 0.08, 0.55] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Microphone icon — inline SVG, no external dependency */}
            <svg
                className={s.icon}
                width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
            >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="9"  y1="22" x2="15" y2="22" />
            </svg>
        </motion.button>
    );
}
