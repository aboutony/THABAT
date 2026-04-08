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
    document.documentElement.classList.toggle('light', t === 'light');
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', t === 'dark' ? '#1E2130' : '#E8ECF0');
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'dark';
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        return (stored === 'dark' || stored === 'light') ? stored : 'dark';
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Apply the resolved theme to the DOM on first mount
        applyTheme(theme);
        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, theme);
        }
        setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
