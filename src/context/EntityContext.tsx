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
    activeEntity: DEMO_ENTITIES[0],
    entities:     DEMO_ENTITIES,
    switchEntity: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────

export function EntityProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [activeEntity, setActiveEntityState] = useState<Entity>(DEMO_ENTITIES[0]);

    useEffect(() => {
        const role = user?.role ?? null;

        // GUEST: always pin to ENT_02 "The Medical Equipment Factory"
        // CLIENT: entity is irrelevant (zero state), default to ENT_01
        // COMMANDER: read from localStorage as normal
        if (role === 'GUEST') {
            const pinned = DEMO_ENTITIES.find(e => e.id === 'ENT_02') ?? DEMO_ENTITIES[0];
            setActiveEntityState(pinned);
            return; // no event listener needed — entity is pinned
        }

        setActiveEntityState(getActiveEntity());

        // Re-sync whenever the entity changes (COMMANDER only path)
        const sync = () => setActiveEntityState(getActiveEntity());
        window.addEventListener('thabat-entity-changed', sync);
        return () => window.removeEventListener('thabat-entity-changed', sync);
    }, [user?.role]);

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
