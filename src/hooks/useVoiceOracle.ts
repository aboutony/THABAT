'use client';

/**
 * useVoiceOracle — Phase 13: Voice Foundation
 *
 * Wraps the Web SpeechRecognition API for both English and Arabic.
 * Returns listening state, the running transcript, and toggle controls.
 * Console-logs every transcript update for accuracy testing in noisy environments.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceOracleState {
    listening:      boolean;
    transcript:     string;
    supported:      boolean;
    startListening: () => void;
    stopListening:  () => void;
    toggle:         () => void;
}

export function useVoiceOracle(locale: string): VoiceOracleState {
    const [listening,  setListening]  = useState(false);
    const [transcript, setTranscript] = useState('');
    const [supported,  setSupported]  = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
        if (!SR) return;

        setSupported(true);

        const rec = new SR();
        rec.continuous      = false;
        rec.interimResults  = true;
        rec.lang            = locale === 'ar' ? 'ar-SA' : 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const text = Array.from<any>(e.results)
                .map((r: any) => r[0].transcript)
                .join('');
            setTranscript(text);
            // Accuracy log — useful for validating in high-noise environments
            console.log('[VoiceOracle] transcript ►', text, '| lang:', rec.lang, '| final:', e.results[e.results.length - 1]?.isFinal);
        };

        rec.onend  = () => setListening(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onerror = (e: any) => {
            console.warn('[VoiceOracle] error:', e.error);
            setListening(false);
        };

        recognitionRef.current = rec;

        return () => { rec.abort(); };
    }, [locale]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) return;
        setTranscript('');
        try {
            recognitionRef.current.start();
            setListening(true);
        } catch {
            // SpeechRecognition throws if already started
        }
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setListening(false);
    }, []);

    const toggle = useCallback(() => {
        if (listening) stopListening(); else startListening();
    }, [listening, startListening, stopListening]);

    return { listening, transcript, supported, startListening, stopListening, toggle };
}
