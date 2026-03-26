'use client';

import { motion } from 'framer-motion';
import s from './LeadTimePulse.module.css';

// ── SVG coordinate system (fixed, scaled by CSS) ─────────────────────────────
const VW       = 360;
const PAD      = 14;
const TRACK_W  = VW - PAD * 2;   // 332px
const TRACK_H  = 8;
const TRACK_Y  = 52;
const DOT_Y    = TRACK_Y + TRACK_H / 2;
const TOTAL    = 30;

function dayToX(day: number) {
    return PAD + (day / TOTAL) * TRACK_W;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FrictionZone {
    start:    number;
    end:      number;
    label:    string;
    labelAr:  string;
    severity: 'high' | 'medium';
}

export interface LeadTimePulseProps {
    currentDay?:    number;
    frictionZones?: FrictionZone[];
    isAr?:          boolean;
    shipmentCount?: number;
}

// ── Default demo friction zones ───────────────────────────────────────────────
export const DEFAULT_ZONES: FrictionZone[] = [
    { start: 7,  end: 12, severity: 'high',   label: 'Customs Hold',    labelAr: 'توقف جمركي'    },
    { start: 20, end: 23, severity: 'medium', label: 'Port Congestion', labelAr: 'ازدحام الميناء' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function LeadTimePulse({
    currentDay    = 18,
    frictionZones = DEFAULT_ZONES,
    isAr          = false,
    shipmentCount = 4,
}: LeadTimePulseProps) {
    const dotX       = dayToX(currentDay);
    const traversedW = dotX - PAD;

    return (
        <div className={s.wrap}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className={s.header}>
                <span className={s.title}>
                    {isAr ? 'نبضة الشحنات — ٣٠ يومًا' : '30-Day Shipment Pulse'}
                </span>
                <span className={s.badge}>
                    <span className={s.liveDot} />
                    {shipmentCount}&nbsp;{isAr ? 'نشطة' : 'Active'}
                </span>
            </div>

            {/* ── SVG Track ───────────────────────────────────────────────── */}
            <svg
                width="100%"
                height="90"
                viewBox={`0 0 ${VW} 90`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Bioluminescent indigo glow */}
                    <filter id="ltp-glow" x="-300%" y="-300%" width="700%" height="700%">
                        <feGaussianBlur stdDeviation="5" result="g1" />
                        <feGaussianBlur stdDeviation="11" result="g2" />
                        <feMerge>
                            <feMergeNode in="g2" />
                            <feMergeNode in="g1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Friction heat bloom */}
                    <filter id="ltp-heat" x="-120%" y="-300%" width="340%" height="700%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Background track gradient */}
                    <linearGradient id="ltp-track" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="rgba(79,70,229,0.05)" />
                        <stop offset="50%"  stopColor="rgba(79,70,229,0.16)" />
                        <stop offset="100%" stopColor="rgba(79,70,229,0.05)" />
                    </linearGradient>
                    {/* Traversed fill gradient */}
                    <linearGradient id="ltp-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="rgba(79,70,229,0.20)" />
                        <stop offset="100%" stopColor="rgba(99,102,241,0.55)" />
                    </linearGradient>
                </defs>

                {/* ── Background track ────────────────────────────────────── */}
                <rect
                    x={PAD} y={TRACK_Y}
                    width={TRACK_W} height={TRACK_H}
                    rx={TRACK_H / 2}
                    fill="url(#ltp-track)"
                    stroke="rgba(79,70,229,0.18)"
                    strokeWidth={1}
                />

                {/* ── Traversed fill (animated from 0 → currentDay width) ── */}
                <motion.rect
                    x={PAD} y={TRACK_Y}
                    height={TRACK_H}
                    rx={TRACK_H / 2}
                    fill="url(#ltp-fill)"
                    initial={{ width: 0 }}
                    animate={{ width: traversedW }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                />

                {/* ── Friction zones ──────────────────────────────────────── */}
                {frictionZones.map((z, i) => {
                    const zx  = dayToX(z.start);
                    const zw  = dayToX(z.end) - zx;
                    const col = z.severity === 'high'
                        ? 'rgba(220,38,38,0.78)'
                        : 'rgba(234,88,12,0.60)';
                    const bg  = z.severity === 'high'
                        ? 'rgba(220,38,38,0.11)'
                        : 'rgba(234,88,12,0.08)';
                    const lbl = isAr ? z.labelAr : z.label;
                    return (
                        <g key={i} filter="url(#ltp-heat)">
                            {/* Heat column above track */}
                            <rect x={zx} y={20} width={zw} height={TRACK_Y - 20} rx={2} fill={bg} />
                            {/* Track segment override */}
                            <rect x={zx} y={TRACK_Y} width={zw} height={TRACK_H} rx={2} fill={col} />
                            {/* Zone label */}
                            <text
                                x={zx + zw / 2} y={16}
                                textAnchor="middle"
                                fontSize={8} fontWeight={700}
                                letterSpacing="0.04"
                                fill={z.severity === 'high'
                                    ? 'rgba(220,38,38,0.92)'
                                    : 'rgba(234,88,12,0.88)'}
                                fontFamily="inherit"
                            >
                                {lbl}
                            </text>
                        </g>
                    );
                })}

                {/* ── Saudi Customs 7-day threshold marker ────────────────── */}
                <line
                    x1={dayToX(7)} y1={TRACK_Y - 8}
                    x2={dayToX(7)} y2={TRACK_Y + TRACK_H + 8}
                    stroke="rgba(212,175,55,0.60)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                />
                <text
                    x={dayToX(7) + 4} y={TRACK_Y - 10}
                    fontSize={8}
                    fill="rgba(212,175,55,0.78)"
                    letterSpacing="0.03"
                    fontFamily="inherit"
                >
                    {isAr ? '٧ أيام' : '7d avg'}
                </text>

                {/* ── Day tick marks ──────────────────────────────────────── */}
                {[0, 7, 14, 21, 30].map(d => (
                    <g key={d}>
                        <line
                            x1={dayToX(d)} y1={TRACK_Y + TRACK_H + 3}
                            x2={dayToX(d)} y2={TRACK_Y + TRACK_H + 9}
                            stroke="rgba(79,70,229,0.22)"
                            strokeWidth={1}
                        />
                        <text
                            x={dayToX(d)}
                            y={TRACK_Y + TRACK_H + 19}
                            textAnchor={d === 0 ? 'start' : d === 30 ? 'end' : 'middle'}
                            fontSize={9}
                            fill="rgba(100,116,139,0.60)"
                            fontFamily="inherit"
                        >
                            {d === 0 ? (isAr ? 'ي١' : 'D1')
                             : d === 30 ? (isAr ? 'ي٣٠' : 'D30')
                             : `D${d}`}
                        </text>
                    </g>
                ))}

                {/* ── Animated bioluminescent dot ──────────────────────────── */}
                <motion.g
                    initial={{ x: PAD }}
                    animate={{ x: dotX }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                    {/* Outer pulsing aura */}
                    <motion.circle
                        cx={0} cy={DOT_Y}
                        r={15}
                        fill="rgba(79,70,229,0.09)"
                        animate={{ r: [12, 18, 12], opacity: [0.14, 0.06, 0.14] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Mid glow halo */}
                    <circle
                        cx={0} cy={DOT_Y}
                        r={9}
                        fill="rgba(79,70,229,0.24)"
                        filter="url(#ltp-glow)"
                    />
                    {/* Core dot */}
                    <circle
                        cx={0} cy={DOT_Y}
                        r={5}
                        fill="#4F46E5"
                        filter="url(#ltp-glow)"
                    />
                    {/* Specular highlight */}
                    <circle
                        cx={-1.5} cy={DOT_Y - 1.8}
                        r={1.8}
                        fill="rgba(255,255,255,0.68)"
                    />
                </motion.g>
            </svg>

            {/* ── Legend ──────────────────────────────────────────────────── */}
            <div className={s.legend}>
                <span className={s.legendItem}>
                    <span className={`${s.dot} ${s.indigo}`} />
                    {isAr ? 'الشحنة النشطة' : 'Active Shipment'}
                </span>
                <span className={s.legendItem}>
                    <span className={`${s.dot} ${s.red}`} />
                    {isAr ? 'منطقة الاحتكاك' : 'Friction Zone'}
                </span>
                <span className={s.legendItem}>
                    <span className={`${s.dot} ${s.gold}`} />
                    {isAr ? 'متوسط الجمارك' : 'SA Customs Avg'}
                </span>
            </div>
        </div>
    );
}
