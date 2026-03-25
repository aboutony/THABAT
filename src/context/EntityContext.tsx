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
    const [activeEntity, setActiveEntityState] = useState<Entity>(DEMO_ENTITIES[0]);

    useEffect(() => {
        // Sync with localStorage on mount
        setActiveEntityState(getActiveEntity());

        // Re-sync whenever the entity changes (from EntitySelector or any tab)
        const sync = () => setActiveEntityState(getActiveEntity());
        window.addEventListener('thabat-entity-changed', sync);
        return () => window.removeEventListener('thabat-entity-changed', sync);
    }, []);

    const switchEntity = useCallback((id: string) => {
        setActiveEntityId(id);
        // State will update via the event listener above — no double-set
    }, []);

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
