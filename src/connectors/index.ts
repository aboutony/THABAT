/**
 * Connector Registry — maps provider keys to connector modules.
 * This is the ONLY entry point for the rest of the application.
 */

import type { ERPConnector, ERPProvider } from './types';
import { OdooConnector } from './odoo';
import { SAPConnector } from './sap';
import { DynamicsConnector } from './dynamics';

export { ERP_CONFIGS } from './types';
export type { ERPProvider, ERPCredentials, NormalizedDailyMetrics, SyncResult } from './types';

const CONNECTORS: Record<ERPProvider, ERPConnector> = {
    odoo: OdooConnector,
    sap: SAPConnector,
    dynamics: DynamicsConnector,
};

export function getConnector(provider: ERPProvider): ERPConnector {
    const connector = CONNECTORS[provider];
    if (!connector) throw new Error(`Unknown ERP provider: ${provider}`);
    return connector;
}
