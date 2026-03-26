'use client';

/**
 * SonicWave — Phase 13: Voice Foundation
 *
 * Animated audio-equalizer bar array that replaces the Oracle scan line
 * while the microphone is active. Uses deterministic heights to avoid
 * re-render flicker. Positioned absolutely inside the Oracle card,
 * matching the scan line's z-layer.
 */

import { motion } from 'framer-motion';
import s from './SonicWave.module.css';

// 30 bars with deterministic heights + timings derived from sine — no Math.random()
const BARS = Array.from({ length: 30 }, (_, i) => ({
    peak:  0.12 + Math.abs(Math.sin(i * 1.4 + 0.5)) * 0.82,
    dur:   0.30 + (i % 7) * 0.045,
    delay: i * 0.025,
}));

export default function SonicWave() {
    return (
        <div className={s.wave} aria-hidden="true">
            {BARS.map((bar, i) => (
                <motion.span
                    key={i}
                    className={s.bar}
                    animate={{ scaleY: [0.10, bar.peak, 0.10] }}
                    transition={{
                        duration:  bar.dur,
                        repeat:    Infinity,
                        ease:      'easeInOut',
                        delay:     bar.delay,
                    }}
                />
            ))}
        </div>
    );
}
