'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import styles from './DriverCard.module.css';

interface DriverCardProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    delay?: number;
    href?: string;
}

export default function DriverCard({ icon, label, description, value, trend, delay = 0, href }: DriverCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    // 3D tilt transforms — extremely subtle, just 'catches the light'
    const rotateX = useTransform(mouseY, [0, 1], [1.5, -1.5]);
    const rotateY = useTransform(mouseX, [0, 1], [-1.5, 1.5]);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handlePointerLeave = () => {
        mouseX.set(0.5);
        mouseY.set(0.5);
    };

    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return '↑';
            case 'down': return '↓';
            default: return '→';
        }
    };

    const getTrendColor = () => {
        switch (trend) {
            case 'up': return 'var(--success)';
            case 'down': return 'var(--danger)';
            default: return 'var(--text-secondary)';
        }
    };

    const cardContent = (
        <motion.div
            ref={cardRef}
            className={`glass-card ${styles.card}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.015, rotateX: 1, rotateY: 1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.6, delay: 0.8 + delay * 0.15, ease: 'easeOut' }}
            style={{
                rotateX,
                rotateY,
                transformPerspective: 800,
                transformStyle: 'preserve-3d',
            }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        >
            <div className={styles.iconBox}>
                {icon}
            </div>
            <div className={styles.content}>
                <div className={styles.label}>{label}</div>
                <div className={styles.description}>{description}</div>
            </div>
            <div className={styles.valueCol}>
                <div className={styles.value}>{value}</div>
                <div className={styles.trend} style={{ color: getTrendColor() }}>
                    {getTrendIcon()}
                </div>
            </div>
        </motion.div>
    );

    if (href) {
        return (
            <Link href={href} className={styles.cardLink}>
                {cardContent}
            </Link>
        );
    }

    return cardContent;
}
