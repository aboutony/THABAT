'use client';

/**
 * useIdentity — Tier-based identity hook (Command #56)
 *
 * Single source of truth for role-gated rendering.
 *   COMMANDER  = adonis@thabat.app  — full feature access, 8-LoB entity switcher
 *   GUEST      = guest@thabat.app   — read-only view, no entity switcher
 *   CLIENT     = all other emails   — empty-state / onboarding experience
 */

import { useAuth } from '@/context/AuthContext';

export interface Identity {
    isCommander: boolean;
    isGuest:     boolean;
    isClient:    boolean;
    role:        string | null;
}

export function useIdentity(): Identity {
    const { user } = useAuth();
    const role = user?.role ?? null;
    return {
        isCommander: role === 'COMMANDER',
        isGuest:     role === 'GUEST',
        isClient:    role === 'CLIENT',
        role,
    };
}
