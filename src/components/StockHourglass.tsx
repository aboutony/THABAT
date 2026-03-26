'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import s from './StockHourglass.module.css';

// ── Hourglass geometry (fixed 80 × 160 viewBox) ───────────────────────────────
const VW      = 80;
const VH      = 160;
const PAD     = 5;
const CX      = VW / 2;      // 40 — horizontal centre
const NECK_Y1 = 78;           // where top bulb ends
const NECK_Y2 = 82;           // where bottom bulb starts
const NECK_HW = 4;            // half-width of neck opening

// SVG path strings for the two bulbs
const TOP_PATH = `M ${PAD},${PAD} L ${VW - PAD},${PAD} L ${CX + NECK_HW},${NECK_Y1} L ${CX - NECK_HW},${NECK_Y1} Z`;
const BOT_PATH = `M ${CX - NECK_HW},${NECK_Y2} L ${CX + NECK_HW},${NECK_Y2} L ${VW - PAD},${VH - PAD} L ${PAD},${VH - PAD} Z`;

// ── Particle slots ────────────────────────────────────────────────────────────
const PARTICLE_X_OFFSETS = [-2, 0, 2, -1, 1, -2.5, 0, 2.5];
const PARTICLE_COUNT = PARTICLE_X_OFFSETS.length;

// ── Props ─────────────────────────────────────────────────────────────────────
export interface StockHourglassProps {
    /** Remaining inventory in days (e.g., 4) */
    stockDays:       number;
    /** Normaliser for fill level (default 30 days) */
    maxStockDays?:   number;
    /** Triggers crimson palette + danger pulse */
    isAtRisk?:       boolean;
    /** 0–1: 1 = max sales speed → fastest particles */
    velocityFactor?: number;
    /** Compact variant: 44 × 88px rendered */
    compact?:        boolean;
}

export default function StockHourglass({
    stockDays,
    maxStockDays   = 30,
    isAtRisk       = false,
    velocityFactor = 0.6,
    compact        = false,
}: StockHourglassProps) {
    const uid = useId().replace(/:/g, '');

    const fillRatio = Math.max(0, Math.min(1, stockDays / maxStockDays));
    const topBulbH  = NECK_Y1 - PAD;            // 73px in viewBox units
    const fillH     = topBulbH * fillRatio;

    // Particle speed: higher velocity → shorter duration per cycle
    const particleDuration = 0.8 + (1 - Math.max(0, Math.min(1, velocityFactor))) * 2.4;

    // Colour tokens
    const col      = isAtRisk ? '#DC2626'         : '#4F46E5';
    const ca       = isAtRisk ? 'rgba(220,38,38,' : 'rgba(79,70,229,';

    // Particle keyframe: start just above neck → through neck → into bottom bulb
    const PART_START = Math.max(PAD + 2, NECK_Y1 - Math.max(fillH * 0.6, 6));
    const PARTICLE_KF = [PART_START, NECK_Y1 - 1, NECK_Y2 + 1, NECK_Y2 + 55];
    const PARTICLE_TIMES = [0, 0.47, 0.53, 1];

    // Display dimensions
    const dispW = compact ? 44  : VW;
    const dispH = compact ? 88  : VH;

    return (
        <div className={`${s.wrap} ${isAtRisk ? s.atRisk : ''} ${compact ? s.compact : ''}`}>
            <svg
                width={dispW}
                height={dispH}
                viewBox={`0 0 ${VW} ${VH}`}
                aria-hidden="true"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Unique clip paths per instance */}
                    <clipPath id={`hg-top-${uid}`}>
                        <path d={TOP_PATH} />
                    </clipPath>
                    <clipPath id={`hg-bot-${uid}`}>
                        <path d={BOT_PATH} />
                    </clipPath>
                    {/* Soft glow for particles */}
                    <filter id={`hg-glow-${uid}`} x="-200%" y="-200%" width="500%" height="500%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Danger glow filter (at-risk state) */}
                    <filter id={`hg-danger-${uid}`} x="-200%" y="-200%" width="500%" height="500%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* ── Bulb outlines ────────────────────────────────────────── */}
                <path
                    d={TOP_PATH}
                    fill={`${ca}0.07)`}
                    stroke={`${ca}0.28)`}
                    strokeWidth={1}
                />
                <path
                    d={BOT_PATH}
                    fill={`${ca}0.09)`}
                    stroke={`${ca}0.28)`}
                    strokeWidth={1}
                />

                {/* Neck connector */}
                <rect
                    x={CX - NECK_HW} y={NECK_Y1}
                    width={NECK_HW * 2} height={NECK_Y2 - NECK_Y1}
                    fill={`${ca}0.22)`}
                />

                {/* ── Top fill — remaining stock sand ─────────────────────── */}
                {fillH > 0 && (
                    <motion.rect
                        x={0}
                        y={NECK_Y1 - fillH}
                        width={VW}
                        height={fillH + 2}
                        fill={`${ca}0.38)`}
                        clipPath={`url(#hg-top-${uid})`}
                        initial={{ height: 0, y: NECK_Y1 }}
                        animate={{ height: fillH + 2, y: NECK_Y1 - fillH }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                )}

                {/* ── Bottom accumulation floor ────────────────────────────── */}
                <rect
                    x={0} y={VH - PAD - 18}
                    width={VW} height={18}
                    fill={`${ca}0.14)`}
                    clipPath={`url(#hg-bot-${uid})`}
                />

                {/* ── Falling sand particles ───────────────────────────────── */}
                {PARTICLE_X_OFFSETS.map((xOff, i) => (
                    <motion.g
                        key={i}
                        style={{ x: CX + xOff }}
                        animate={{ y: PARTICLE_KF }}
                        transition={{
                            duration:  particleDuration,
                            times:     PARTICLE_TIMES,
                            ease:      'linear',
                            repeat:    Infinity,
                            delay:     i * (particleDuration / PARTICLE_COUNT),
                            repeatDelay: 0,
                        }}
                    >
                        <circle
                            cx={0} cy={0}
                            r={isAtRisk ? 2.5 : 2}
                            fill={col}
                            filter={`url(#hg-glow-${uid})`}
                            opacity={0.88}
                        />
                    </motion.g>
                ))}

                {/* ── At-risk outer pulse ring ─────────────────────────────── */}
                {isAtRisk && (
                    <motion.path
                        d={TOP_PATH}
                        fill="none"
                        stroke="rgba(220,38,38,0.55)"
                        strokeWidth={2}
                        filter={`url(#hg-danger-${uid})`}
                        animate={{ opacity: [0.6, 0.15, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}
            </svg>
        </div>
    );
}
