'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => { },
    setTheme: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

const STORAGE_KEY = 'thabat-theme';

function applyTheme(t: Theme) {
    document.documentElement.setAttribute('data-theme', t);
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', t === 'dark' ? '#1E2130' : '#E8ECF0');
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Read stored preference (anti-FOUC script already set the attribute)
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored && (stored === 'dark' || stored === 'light')) {
            setThemeState(stored);
            applyTheme(stored);
        } else {
            // Always default to dark for the Rolex exec demo
            const initial: Theme = 'dark';
            setThemeState(initial);
            applyTheme(initial);
            localStorage.setItem(STORAGE_KEY, initial);
        }
        setMounted(true);
    }, []);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        localStorage.setItem(STORAGE_KEY, t);
        applyTheme(t);
    }, []);

    const toggleTheme = useCallback(() => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.15s ease-in' }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}
