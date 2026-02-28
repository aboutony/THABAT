/**
 * SAP Business One Connector
 *
 * Connects via SAP Service Layer (REST API).
 * Maps standard SAP objects → Internal Normalized Schema.
 *
 * Key mappings:
 *   OINV (A/R Invoices)        → Revenue
 *   OPCH (A/P Invoices)        → Expenses
 *   OVPM (Outgoing Payments)   → Cash outflow
 *   ORCT (Incoming Payments)   → Cash inflow
 *   JournalEntries             → Cash Balance reconciliation
 */

import type {
    ERPConnector,
    ERPCredentials,
    SAPCredentials,
    ConnectionTestResult,
    NormalizedDailyMetrics,
} from './types';

function asSAP(creds: ERPCredentials): SAPCredentials {
    if (creds.provider !== 'sap') throw new Error('Invalid credentials for SAP');
    return creds as SAPCredentials;
}

async function sapLogin(c: SAPCredentials): Promise<{ sessionId: string }> {
    const res = await fetch(`${c.serviceLayerUrl}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            CompanyDB: c.companyDB,
            UserName: c.username,
            Password: c.password,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`SAP Login failed: ${err}`);
    }

    const data = await res.json();
    return { sessionId: data.SessionId };
}

async function sapQuery<T>(
    baseUrl: string,
    sessionId: string,
    endpoint: string,
    filter?: string
): Promise<T[]> {
    let url = `${baseUrl}/${endpoint}`;
    if (filter) url += `?$filter=${encodeURIComponent(filter)}`;

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            Cookie: `B1SESSION=${sessionId}`,
        },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.value || [];
}

export const SAPConnector: ERPConnector = {
    async testConnection(credentials: ERPCredentials): Promise<ConnectionTestResult> {
        const c = asSAP(credentials);
        try {
            const { sessionId } = await sapLogin(c);

            // Logout gracefully
            await fetch(`${c.serviceLayerUrl}/Logout`, {
                method: 'POST',
                headers: { Cookie: `B1SESSION=${sessionId}` },
            });

            return { success: true, message: 'Connected to SAP Business One successfully', provider: 'sap' };
        } catch (error) {
            return { success: false, message: `SAP connection failed: ${(error as Error).message}`, provider: 'sap' };
        }
    },

    async fetchMetrics(
        credentials: ERPCredentials,
        fromDate: string,
        toDate: string
    ): Promise<NormalizedDailyMetrics[]> {
        const c = asSAP(credentials);

        try {
            const { sessionId } = await sapLogin(c);

            // Fetch A/R Invoices (OINV) → Revenue
            const invoices = await sapQuery<{
                DocDate: string;
                DocTotal: number;
                DocTotalFc: number;
            }>(
                c.serviceLayerUrl,
                sessionId,
                'Invoices',
                `DocDate ge '${fromDate}' and DocDate le '${toDate}'`
            );

            // Fetch A/P Invoices (OPCH) → Expenses
            const purchaseInvoices = await sapQuery<{
                DocDate: string;
                DocTotal: number;
            }>(
                c.serviceLayerUrl,
                sessionId,
                'PurchaseInvoices',
                `DocDate ge '${fromDate}' and DocDate le '${toDate}'`
            );

            // Fetch Incoming Payments (ORCT) → Cash inflow
            const incomingPayments = await sapQuery<{
                DocDate: string;
                CashSum: number;
                TransferSum: number;
            }>(
                c.serviceLayerUrl,
                sessionId,
                'IncomingPayments',
                `DocDate ge '${fromDate}' and DocDate le '${toDate}'`
            );

            // Fetch Outgoing Payments (OVPM) → Cash outflow
            const outgoingPayments = await sapQuery<{
                DocDate: string;
                CashSum: number;
                TransferSum: number;
            }>(
                c.serviceLayerUrl,
                sessionId,
                'VendorPayments',
                `DocDate ge '${fromDate}' and DocDate le '${toDate}'`
            );

            // Aggregate by date
            const dateMap = new Map<string, NormalizedDailyMetrics>();

            const getOrCreate = (date: string): NormalizedDailyMetrics => {
                if (!dateMap.has(date)) {
                    dateMap.set(date, { date, cashBalance: 0, revenue: 0, expenses: 0, receivables: 0, payables: 0 });
                }
                return dateMap.get(date)!;
            };

            for (const inv of invoices) {
                const m = getOrCreate(inv.DocDate);
                m.revenue += inv.DocTotal || 0;
                m.receivables += inv.DocTotal || 0;
            }

            for (const pi of purchaseInvoices) {
                const m = getOrCreate(pi.DocDate);
                m.expenses += pi.DocTotal || 0;
                m.payables += pi.DocTotal || 0;
            }

            for (const ip of incomingPayments) {
                const m = getOrCreate(ip.DocDate);
                m.cashBalance += (ip.CashSum || 0) + (ip.TransferSum || 0);
            }

            for (const op of outgoingPayments) {
                const m = getOrCreate(op.DocDate);
                m.cashBalance -= (op.CashSum || 0) + (op.TransferSum || 0);
            }

            // Logout
            await fetch(`${c.serviceLayerUrl}/Logout`, {
                method: 'POST',
                headers: { Cookie: `B1SESSION=${sessionId}` },
            }).catch(() => { });

            return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error('SAP fetch error:', error);
            return [];
        }
    },
};
