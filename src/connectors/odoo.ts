/**
 * Odoo ERP Connector
 *
 * Connects via XML-RPC / JSON-RPC API.
 * Maps Odoo objects → Internal Normalized Schema.
 *
 * Key mappings:
 *   account.move (type=out_invoice)  → Revenue
 *   account.move (type=in_invoice)   → Expenses
 *   account.move.line (receivable)   → Receivables
 *   account.move.line (payable)      → Payables
 *   account.bank.statement           → Cash Balance
 */

import type {
    ERPConnector,
    ERPCredentials,
    OdooCredentials,
    ConnectionTestResult,
    NormalizedDailyMetrics,
} from './types';

function asOdoo(creds: ERPCredentials): OdooCredentials {
    if (creds.provider !== 'odoo') throw new Error('Invalid credentials for Odoo');
    return creds as OdooCredentials;
}

export const OdooConnector: ERPConnector = {
    async testConnection(credentials: ERPCredentials): Promise<ConnectionTestResult> {
        const c = asOdoo(credentials);
        try {
            // Test via JSON-RPC version_info endpoint
            const res = await fetch(`${c.url}/web/session/get_session_info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {},
                }),
            });

            if (!res.ok) {
                return { success: false, message: `HTTP ${res.status}: Unable to reach Odoo server`, provider: 'odoo' };
            }

            const data = await res.json();
            if (data.error) {
                return { success: false, message: data.error.message || 'Odoo authentication failed', provider: 'odoo' };
            }

            return { success: true, message: 'Connected to Odoo successfully', provider: 'odoo' };
        } catch (error) {
            return { success: false, message: `Connection failed: ${(error as Error).message}`, provider: 'odoo' };
        }
    },

    async fetchMetrics(
        credentials: ERPCredentials,
        fromDate: string,
        toDate: string
    ): Promise<NormalizedDailyMetrics[]> {
        const c = asOdoo(credentials);

        try {
            // Authenticate via JSON-RPC
            const authRes = await fetch(`${c.url}/web/session/authenticate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    params: {
                        db: c.database,
                        login: c.username,
                        password: c.apiKey,
                    },
                }),
            });

            if (!authRes.ok) throw new Error('Authentication failed');

            const sessionCookie = authRes.headers.get('set-cookie') || '';

            // Fetch invoices (revenue) via JSON-RPC
            const invoiceRes = await fetch(`${c.url}/web/dataset/call_kw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: sessionCookie,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'account.move',
                        method: 'search_read',
                        args: [[
                            ['move_type', '=', 'out_invoice'],
                            ['state', '=', 'posted'],
                            ['invoice_date', '>=', fromDate],
                            ['invoice_date', '<=', toDate],
                        ]],
                        kwargs: {
                            fields: ['invoice_date', 'amount_total_signed'],
                        },
                    },
                }),
            });

            const invoices = (await invoiceRes.json()).result || [];

            // Fetch vendor bills (expenses)
            const billRes = await fetch(`${c.url}/web/dataset/call_kw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: sessionCookie,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'account.move',
                        method: 'search_read',
                        args: [[
                            ['move_type', '=', 'in_invoice'],
                            ['state', '=', 'posted'],
                            ['invoice_date', '>=', fromDate],
                            ['invoice_date', '<=', toDate],
                        ]],
                        kwargs: {
                            fields: ['invoice_date', 'amount_total_signed'],
                        },
                    },
                }),
            });

            const bills = (await billRes.json()).result || [];

            // Aggregate by date
            const dateMap = new Map<string, NormalizedDailyMetrics>();

            const getOrCreate = (date: string): NormalizedDailyMetrics => {
                if (!dateMap.has(date)) {
                    dateMap.set(date, {
                        date,
                        cashBalance: 0,
                        revenue: 0,
                        expenses: 0,
                        receivables: 0,
                        payables: 0,
                    });
                }
                return dateMap.get(date)!;
            };

            for (const inv of invoices) {
                const m = getOrCreate(inv.invoice_date);
                m.revenue += Math.abs(inv.amount_total_signed || 0);
                m.receivables += Math.abs(inv.amount_total_signed || 0);
            }

            for (const bill of bills) {
                const m = getOrCreate(bill.invoice_date);
                m.expenses += Math.abs(bill.amount_total_signed || 0);
                m.payables += Math.abs(bill.amount_total_signed || 0);
            }

            return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error('Odoo fetch error:', error);
            return [];
        }
    },
};
