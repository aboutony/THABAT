'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from './ThemeContext';

interface User {
    id: string;
    orgId: string;
    email: string;
    fullName: string;
    role: string;
    languagePreference: string;
    themePreference: string;
    orgName?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ error?: string }>;
    signup: (data: SignupData) => Promise<{ error?: string }>;
    logout: () => Promise<void>;
}

interface SignupData {
    email: string;
    password: string;
    fullName: string;
    orgName: string;
    industry?: string;
    revenueBand?: string;
    growthStage?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const { setTheme } = useTheme();

    // Apply user preferences on auth — theme only.
    // Language is determined by the URL locale prefix, not DB preference,
    // to avoid overriding an intentional language toggle.
    // Theme: localStorage is the source of truth. DB preference is only
    // used on first login (when no localStorage entry exists).
    const applyPreferences = useCallback((userData: User) => {
        if (userData.themePreference) {
            const stored = typeof window !== 'undefined'
                ? localStorage.getItem('thabat-theme')
                : null;
            // Only apply DB theme if user hasn't set a local preference
            if (!stored) {
                setTheme(userData.themePreference as 'dark' | 'light');
            }
        }
    }, [setTheme]);

    // Hydrate session on mount
    useEffect(() => {
        async function hydrate() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    applyPreferences(data.user);
                }
            } catch {
                // Not authenticated — that's fine
            } finally {
                setLoading(false);
            }
        }
        hydrate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { error: data.error || 'Login failed' };
            }

            setUser(data.user);
            applyPreferences(data.user);
            return {};
        } catch {
            return { error: 'Network error' };
        }
    }, [applyPreferences]);

    const signup = useCallback(async (signupData: SignupData) => {
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupData),
            });

            const data = await res.json();

            if (!res.ok) {
                return { error: data.error || 'Signup failed' };
            }

            setUser(data.user);
            applyPreferences(data.user);
            return {};
        } catch {
            return { error: 'Network error' };
        }
    }, [applyPreferences]);

    const logout = useCallback(async () => {
        await fetch('/api/auth/me', { method: 'DELETE' });
        setUser(null);
        const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
        router.push(`/${locale}/login`);
    }, [pathname, router]);

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
