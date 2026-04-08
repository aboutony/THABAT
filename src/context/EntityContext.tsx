'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import {
    getActiveEntity,
    setActiveEntityId,
    DEMO_ENTITIES,
    type Entity,
} from '@/lib/entityContext';
import { useAuth } from '@/context/AuthContext';

// ── Context shape ──────────────────────────────────────────────────────────

interface EntityContextValue {
    activeEntity: Entity;
    entities:     Entity[];
    switchEntity: (id: string) => void;
}

const EntityContext = createContext<EntityContextValue>({
    activeEntity: DEMO_ENTITIES.find(e => e.id === 'ENT_03') ?? DEMO_ENTITIES[0],
    entities:     DEMO_ENTITIES,
    switchEntity: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────

export function EntityProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [activeEntity, setActiveEntityState] = useState<Entity>(() =>
        DEMO_ENTITIES.find(e => e.id === 'ENT_03') ?? DEMO_ENTITIES[0],
    );

    // Derive entity from role without calling setState inside the effect body
    const role = user?.role ?? null;
    const entityForRole: Entity =
        role === 'GUEST'
            ? (DEMO_ENTITIES.find(e => e.id === 'ENT_03') ?? DEMO_ENTITIES[0])
            : getActiveEntity();

    // Sync resolved entity into state when role changes (runs outside effect)
    const [syncedRole, setSyncedRole] = useState<string | null>(null);
    if (syncedRole !== role) {
        setSyncedRole(role);
        setActiveEntityState(entityForRole);
    }

    useEffect(() => {
        if (role === 'GUEST') return; // entity is pinned — no listener needed
        // Re-sync when COMMANDER switches entity
        const sync = () => setActiveEntityState(getActiveEntity());
        window.addEventListener('thabat-entity-changed', sync);
        return () => window.removeEventListener('thabat-entity-changed', sync);
    }, [role]);

    const switchEntity = useCallback((id: string) => {
        const role = user?.role ?? null;
        // Only COMMANDER can switch entities
        if (role !== 'COMMANDER') return;
        setActiveEntityId(id);
        // State will update via the event listener above — no double-set
    }, [user?.role]);

    return (
        <EntityContext.Provider value={{ activeEntity, entities: DEMO_ENTITIES, switchEntity }}>
            {children}
        </EntityContext.Provider>
    );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useEntity(): EntityContextValue {
    return useContext(EntityContext);
}
