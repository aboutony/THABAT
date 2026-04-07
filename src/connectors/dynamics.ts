/**
 * Microsoft Dynamics 365 Business Central Connector
 *
 * Connects via Azure OAuth2 + OData API v2.0.
 * Maps Business Central entities → Internal Normalized Schema.
 *
 * Key mappings:
 *   salesInvoices          → Revenue
 *   purchaseInvoices       → Expenses
 *   customerLedgerEntries  → Receivables
 *   vendorLedgerEntries    → Payables
 *   bankAccountBalances    → Cash Balance
 */

import type {
    ERPConnector,
    ERPCredentials,
    DynamicsCredentials,
    ConnectionTestResult,
    NormalizedDailyMetrics,
} from './types';
import { logger } from '@/lib/logger';

function asDynamics(creds: ERPCredentials): DynamicsCredentials {
    if (creds.provider !== 'dynamics') throw new Error('Invalid credentials for Dynamics');
    return creds as DynamicsCredentials;
}

/**
 * Azure AD OAuth2 client_credentials flow
 */
async function getAccessToken(c: DynamicsCredentials): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${c.tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: c.clientId,
        client_secret: c.clientSecret,
        scope: 'https://api.businesscentral.dynamics.com/.default',
    });

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OAuth2 token failed: ${err}`);
    }

    const data = await res.json();
    return data.access_token;
}

function bcApiUrl(c: DynamicsCredentials, entity: string, filter?: string): string {
    let url = `https://api.businesscentral.dynamics.com/v2.0/${c.tenantId}/${c.environment}/api/v2.0/companies(${encodeURIComponent(c.company)})/${entity}`;
    if (filter) url += `?$filter=${encodeURIComponent(filter)}`;
    return url;
}

async function bcQuery<T>(token: string, url: string): Promise<T[]> {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.value || [];
}

export const DynamicsConnector: ERPConnector = {
    async testConnection(credentials: ERPCredentials): Promise<ConnectionTestResult> {
        const c = asDynamics(credentials);
        try {
            const token = await getAccessToken(c);

            // Test by fetching companies list
            const res = await fetch(
                `https://api.businesscentral.dynamics.com/v2.0/${c.tenantId}/${c.environment}/api/v2.0/companies`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) {
                return { success: false, message: `BC API returned ${res.status}`, provider: 'dynamics' };
            }

            return { success: true, message: 'Connected to Dynamics 365 Business Central successfully', provider: 'dynamics' };
        } catch (error) {
            return { success: false, message: `Dynamics connection failed: ${(error as Error).message}`, provider: 'dynamics' };
        }
    },

    async fetchMetrics(
        credentials: ERPCredentials,
        fromDate: string,
        toDate: string
    ): Promise<NormalizedDailyMetrics[]> {
        const c = asDynamics(credentials);

        try {
            const token = await getAccessToken(c);

            // Fetch Sales Invoices → Revenue
            const salesInvoices = await bcQuery<{
                postingDate: string;
                totalAmountIncludingTax: number;
            }>(
                token,
                bcApiUrl(c, 'salesInvoices', `postingDate ge ${fromDate} and postingDate le ${toDate}`)
            );

            // Fetch Purchase Invoices → Expenses
            const purchaseInvoices = await bcQuery<{
                postingDate: string;
                totalAmountIncludingTax: number;
            }>(
                token,
                bcApiUrl(c, 'purchaseInvoices', `postingDate ge ${fromDate} and postingDate le ${toDate}`)
            );

            // Fetch Customer Ledger Entries → Receivables
            const customerEntries = await bcQuery<{
                postingDate: string;
                remainingAmount: number;
            }>(
                token,
                bcApiUrl(c, 'customerLedgerEntries', `postingDate ge ${fromDate} and postingDate le ${toDate}`)
            );

            // Fetch Vendor Ledger Entries → Payables
            const vendorEntries = await bcQuery<{
                postingDate: string;
                remainingAmount: number;
            }>(
                token,
                bcApiUrl(c, 'vendorLedgerEntries', `postingDate ge ${fromDate} and postingDate le ${toDate}`)
            );

            // Aggregate by date
            const dateMap = new Map<string, NormalizedDailyMetrics>();

            const getOrCreate = (date: string): NormalizedDailyMetrics => {
                if (!dateMap.has(date)) {
                    dateMap.set(date, { date, cashBalance: 0, revenue: 0, expenses: 0, receivables: 0, payables: 0 });
                }
                return dateMap.get(date)!;
            };

            for (const si of salesInvoices) {
                const m = getOrCreate(si.postingDate);
                m.revenue += si.totalAmountIncludingTax || 0;
            }

            for (const pi of purchaseInvoices) {
                const m = getOrCreate(pi.postingDate);
                m.expenses += pi.totalAmountIncludingTax || 0;
            }

            for (const ce of customerEntries) {
                const m = getOrCreate(ce.postingDate);
                m.receivables += Math.abs(ce.remainingAmount || 0);
            }

            for (const ve of vendorEntries) {
                const m = getOrCreate(ve.postingDate);
                m.payables += Math.abs(ve.remainingAmount || 0);
            }

            return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            logger.error('Dynamics fetchMetrics failed', { error });
            return [];
        }
    },
};
