'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useEntity } from '@/context/EntityContext';
import { useIdentity } from '@/hooks/useIdentity';
import s from './EntitySelector.module.css';

export default function EntitySelector() {
    const locale = useLocale();
    const { activeEntity, entities, switchEntity } = useEntity();
    const { isCommander } = useIdentity();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function onOutside(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [open]);

    function handleSelect(id: string) {
        switchEntity(id);
        setOpen(false);
    }

    // Score colour mirrors the stability ring gradient
    function scoreColor(score: number): string {
        if (score >= 75) return '#4ADE80';
        if (score >= 50) return '#D4AF37';
        return '#F87171';
    }

    const displayName = locale === 'ar' ? activeEntity.nameAr : activeEntity.name;

    return (
        <div className={s.wrapper} ref={wrapRef}>

            {/* ── Trigger pill ───────────────────────────────────────── */}
            <button
                className={`${s.trigger} ${open ? s.triggerOpen : ''}`}
                onClick={() => setOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {/* Entity colour dot */}
                <span
                    className={s.dot}
                    style={{
                        background: activeEntity.accent,
                        boxShadow: `0 0 6px ${activeEntity.accent}88`,
                    }}
                />

                {/* Name */}
                <span className={s.entityName}>{displayName}</span>

                {/* Health score badge */}
                <span
                    className={s.scoreBadge}
                    style={{
                        color:      scoreColor(activeEntity.healthScore),
                        background: `${scoreColor(activeEntity.healthScore)}18`,
                    }}
                >
                    {activeEntity.healthScore}
                </span>

                {/* Chevron */}
                <span className={`${s.chevron} ${open ? s.chevronOpen : ''}`}>▾</span>
            </button>

            {/* ── Dropdown ────────────────────────────────────────────── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        role="listbox"
                        className={s.dropdown}
                        initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
                        animate={{ opacity: 1, y: 0,  scaleY: 1    }}
                        exit={{    opacity: 0, y: -6, scaleY: 0.92 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ transformOrigin: 'top' }}
                    >
                        {entities.map((entity, i) => {
                            const isActive  = entity.id === activeEntity.id;
                            const dName     = locale === 'ar' ? entity.nameAr : entity.name;
                            const dIndustry = locale === 'ar' ? entity.industryAr : entity.industry;
                            const sColor    = scoreColor(entity.healthScore);

                            return (
                                <motion.button
                                    key={entity.id}
                                    role="option"
                                    aria-selected={isActive}
                                    className={`${s.item} ${isActive ? s.itemActive : ''}`}
                                    onClick={() => handleSelect(entity.id)}
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    {/* Colour dot */}
                                    <span
                                        className={s.itemDot}
                                        style={{
                                            background: entity.accent,
                                            boxShadow: `0 0 6px ${entity.accent}66`,
                                        }}
                                    />

                                    {/* Name + industry */}
                                    <div className={s.itemMeta}>
                                        <span className={s.itemName}>{dName}</span>
                                        <span className={s.itemIndustry}>{dIndustry}</span>
                                    </div>

                                    {/* Health score */}
                                    <div className={s.itemScore}>
                                        <span className={s.itemScoreVal} style={{ color: sColor }}>
                                            {entity.healthScore}
                                        </span>
                                        <span className={s.itemScoreLabel}>Score</span>
                                    </div>

                                    {/* Active check */}
                                    <span className={s.itemCheck}>
                                        {isActive ? '✓' : ''}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
