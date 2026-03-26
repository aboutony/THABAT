'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { findOptimalPath } from '@/lib/findOptimalPath';
import type { OptimalResult } from '@/lib/findOptimalPath';
import type { ScenarioLevers } from '@/lib/projectScenarioImpact';
import s from './OptimizerWidget.module.css';

interface OptimizerWidgetProps {
    onOptimize: (levers: ScenarioLevers, result: OptimalResult) => void;
}

export default function OptimizerWidget({ onOptimize }: OptimizerWidgetProps) {
    const t = useTranslations('optimizer');
    const [spinning, setSpinning] = useState(false);

    function handleSpark() {
        if (spinning) return;
        setSpinning(true);
        // Tiny delay so the pulse animation fires before synchronous work
        setTimeout(() => {
            const result = findOptimalPath('balanced');
            onOptimize(result.levers, result);
            setSpinning(false);
        }, 180);
    }

    return (
        <button
            className={`${s.sparkBtn} ${spinning ? s.spinning : ''}`}
            onClick={handleSpark}
            aria-label={t('sparkLabel')}
        >
            <span className={s.sparkIcon}>⚡</span>
            {t('sparkLabel')}
        </button>
    );
}
