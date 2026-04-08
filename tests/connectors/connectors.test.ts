/**
 * ERP Connector Tests — Mock Layer + Interface Contract
 *
 * Strategy:
 *   - Mock global `fetch` so connectors never hit real network
 *   - Verify interface contract: testConnection() → ConnectionTestResult shape
 *   - Verify fetchMetrics() → NormalizedDailyMetrics[] shape
 *   - Verify each connector handles auth failure gracefully
 *   - Verify each connector returns success: false (not throws) on network error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConnector } from '@/connectors';
import type { NormalizedDailyMetrics } from '@/connectors';
import type {
    SAPCredentials,
    OdooCredentials,
    DynamicsCredentials,
} from '@/connectors/types';

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetch(responses: Array<{ ok: boolean; json?: unknown; text?: string }>) {
    let callIndex = 0;
    return vi.fn().mockImplementation(() => {
        const resp = responses[Math.min(callIndex++, responses.length - 1)];
        return Promise.resolve({
            ok: resp.ok,
            json: () => Promise.resolve(resp.json ?? {}),
            text: () => Promise.resolve(resp.text ?? ''),
        });
    });
}

// ─── ERP Credential fixtures ──────────────────────────────────────────────────

const SAP_CREDS: SAPCredentials = {
    provider: 'sap',
    serviceLayerUrl: 'https://sap.test:50000/b1s/v1',
    companyDB: 'TestDB',
    username: 'manager',
    password: 'secret',
};

const ODOO_CREDS: OdooCredentials = {
    provider: 'odoo',
    url: 'https://mycompany.odoo.com',
    database: 'mydb',
    username: 'admin@company.com',
    apiKey: 'test-api-key',
};

const DYNAMICS_CREDS: DynamicsCredentials = {
    provider: 'dynamics',
    tenantId: 'tenant-id-xxx',
    clientId: 'client-id-xxx',
    clientSecret: 'secret-xxx',
    environment: 'sandbox',
    company: 'CRONUS',
};

// ─── Interface contract: shared assertions ────────────────────────────────────

function assertConnectionTestResult(result: unknown) {
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('provider');
    expect(typeof (result as { success: boolean }).success).toBe('boolean');
    expect(typeof (result as { message: string }).message).toBe('string');
}

function assertNormalizedMetrics(metrics: NormalizedDailyMetrics[]) {
    expect(Array.isArray(metrics)).toBe(true);
    for (const m of metrics) {
        expect(m).toHaveProperty('date');
        expect(m).toHaveProperty('cashBalance');
        expect(m).toHaveProperty('revenue');
        expect(m).toHaveProperty('expenses');
        expect(m).toHaveProperty('receivables');
        expect(m).toHaveProperty('payables');
        expect(typeof m.date).toBe('string');
        expect(/^\d{4}-\d{2}-\d{2}/.test(m.date)).toBe(true);
        expect(typeof m.cashBalance).toBe('number');
        expect(typeof m.revenue).toBe('number');
    }
}

// ─── getConnector registry ────────────────────────────────────────────────────

describe('getConnector', () => {
    it('returns a connector for sap', () => {
        expect(getConnector('sap')).toBeDefined();
    });

    it('returns a connector for odoo', () => {
        expect(getConnector('odoo')).toBeDefined();
    });

    it('returns a connector for dynamics', () => {
        expect(getConnector('dynamics')).toBeDefined();
    });

    it('throws for unknown provider', () => {
        expect(() => getConnector('unknown' as never)).toThrow('Unknown ERP provider');
    });

    it('each connector implements testConnection', () => {
        for (const provider of ['sap', 'odoo', 'dynamics'] as const) {
            const connector = getConnector(provider);
            expect(typeof connector.testConnection).toBe('function');
        }
    });

    it('each connector implements fetchMetrics', () => {
        for (const provider of ['sap', 'odoo', 'dynamics'] as const) {
            const connector = getConnector(provider);
            expect(typeof connector.fetchMetrics).toBe('function');
        }
    });
});

// ─── SAP Connector ────────────────────────────────────────────────────────────

describe('SAPConnector', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('testConnection: returns success=true when SAP login succeeds', async () => {
        global.fetch = mockFetch([
            { ok: true, json: { SessionId: 'abc123' } }, // Login
            { ok: true, json: {} },                       // Logout
        ]);

        const connector = getConnector('sap');
        const result = await connector.testConnection(SAP_CREDS);

        assertConnectionTestResult(result);
        expect(result.success).toBe(true);
        expect(result.provider).toBe('sap');
    });

    it('testConnection: returns success=false when SAP login fails (HTTP error)', async () => {
        global.fetch = mockFetch([
            { ok: false, text: 'Unauthorized' }, // Login fails
        ]);

        const connector = getConnector('sap');
        const result = await connector.testConnection(SAP_CREDS);

        assertConnectionTestResult(result);
        expect(result.success).toBe(false);
        expect(result.message).toContain('SAP');
    });

    it('testConnection: returns success=false on network error (no throw)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

        const connector = getConnector('sap');
        const result = await connector.testConnection(SAP_CREDS);

        expect(result.success).toBe(false);
    });

    it('fetchMetrics: returns empty array on login failure', async () => {
        global.fetch = mockFetch([
            { ok: false, text: 'Unauthorized' },
        ]);

        const connector = getConnector('sap');
        const result = await connector.fetchMetrics(SAP_CREDS, '2025-01-01', '2025-01-31');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    it('fetchMetrics: returns NormalizedDailyMetrics[] with correct shape', async () => {
        global.fetch = mockFetch([
            // Login
            { ok: true, json: { SessionId: 'sess-1' } },
            // Invoices (A/R) → revenue
            { ok: true, json: { value: [{ DocDate: '2025-01-05', DocTotal: 10000, DocCurrency: 'SAR', VatSum: 150 }] } },
            // PurchaseInvoices (A/P) → expenses
            { ok: true, json: { value: [{ DocDate: '2025-01-05', DocTotal: 6000, DocCurrency: 'SAR', VatSum: 900 }] } },
            // IncomingPayments → cash inflow
            { ok: true, json: { value: [{ DocDate: '2025-01-05', CashSum: 8000, TransferSum: 0 }] } },
            // VendorPayments → cash outflow
            { ok: true, json: { value: [{ DocDate: '2025-01-05', CashSum: 5000, TransferSum: 0 }] } },
            // Logout
            { ok: true, json: {} },
        ]);

        const connector = getConnector('sap');
        const result = await connector.fetchMetrics(SAP_CREDS, '2025-01-01', '2025-01-31');

        assertNormalizedMetrics(result);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].revenue).toBe(10000);
        expect(result[0].expenses).toBe(6000);
        expect(result[0].cashBalance).toBe(3000); // 8000 inflow - 5000 outflow
    });

    it('fetchMetrics: wrong provider credentials cause a thrown error', async () => {
        const connector = getConnector('sap');
        // SAP connector calls asSAP() which throws synchronously on wrong provider
        await expect(
            connector.fetchMetrics(ODOO_CREDS as never, '2025-01-01', '2025-01-31')
        ).rejects.toThrow('Invalid credentials for SAP');
    });
});

// ─── Odoo Connector ───────────────────────────────────────────────────────────

describe('OdooConnector', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('testConnection: returns success=true when Odoo authenticate succeeds', async () => {
        global.fetch = mockFetch([
            { ok: true, json: { result: 42 } }, // uid returned
        ]);

        const connector = getConnector('odoo');
        const result = await connector.testConnection(ODOO_CREDS);

        assertConnectionTestResult(result);
        expect(result.success).toBe(true);
        expect(result.provider).toBe('odoo');
    });

    it('testConnection: returns success=false when Odoo server returns an error object', async () => {
        // Odoo connector checks data.error field (not uid) — error key present → failure
        global.fetch = mockFetch([
            { ok: true, json: { error: { message: 'Invalid login credentials' } } },
        ]);

        const connector = getConnector('odoo');
        const result = await connector.testConnection(ODOO_CREDS);

        assertConnectionTestResult(result);
        expect(result.success).toBe(false);
    });

    it('testConnection: returns success=false on network error (no throw)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

        const connector = getConnector('odoo');
        const result = await connector.testConnection(ODOO_CREDS);

        expect(result.success).toBe(false);
    });

    it('fetchMetrics: returns empty array when authentication fails', async () => {
        global.fetch = mockFetch([
            { ok: true, json: { result: null } }, // auth fails → uid = null
        ]);

        const connector = getConnector('odoo');
        const result = await connector.fetchMetrics(ODOO_CREDS, '2025-01-01', '2025-01-31');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    it('fetchMetrics: returns NormalizedDailyMetrics[] with correct shape on success', async () => {
        // Odoo: auth → invoices → bills → payments → vendor bills
        global.fetch = mockFetch([
            // authenticate
            { ok: true, json: { result: 7 } },
            // invoices (account.move type out_invoice)
            { ok: true, json: { result: [
                { invoice_date: '2025-01-10', amount_total: 15000, currency_id: [1, 'SAR'], amount_tax: 1500 }
            ]}},
            // bills (account.move type in_invoice)
            { ok: true, json: { result: [
                { invoice_date: '2025-01-10', amount_total: 9000, currency_id: [1, 'SAR'], amount_tax: 900 }
            ]}},
            // payments (account.payment type inbound)
            { ok: true, json: { result: [
                { date: '2025-01-10', amount: 12000, currency_id: [1, 'SAR'] }
            ]}},
            // outgoing payments (account.payment type outbound)
            { ok: true, json: { result: [
                { date: '2025-01-10', amount: 7000, currency_id: [1, 'SAR'] }
            ]}},
        ]);

        const connector = getConnector('odoo');
        const result = await connector.fetchMetrics(ODOO_CREDS, '2025-01-01', '2025-01-31');

        assertNormalizedMetrics(result);
    });
});

// ─── Dynamics Connector ───────────────────────────────────────────────────────

describe('DynamicsConnector', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('testConnection: returns success=true when OAuth2 token + company query succeeds', async () => {
        global.fetch = mockFetch([
            { ok: true, json: { access_token: 'tok-abc', token_type: 'Bearer', expires_in: 3600 } },
            { ok: true, json: { value: [{ id: 'comp-1' }] } },
        ]);

        const connector = getConnector('dynamics');
        const result = await connector.testConnection(DYNAMICS_CREDS);

        assertConnectionTestResult(result);
        expect(result.success).toBe(true);
        expect(result.provider).toBe('dynamics');
    });

    it('testConnection: returns success=false when OAuth2 token request fails', async () => {
        global.fetch = mockFetch([
            { ok: false, text: 'invalid_client' },
        ]);

        const connector = getConnector('dynamics');
        const result = await connector.testConnection(DYNAMICS_CREDS);

        assertConnectionTestResult(result);
        expect(result.success).toBe(false);
    });

    it('testConnection: returns success=false on network error (no throw)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('DNS failure'));

        const connector = getConnector('dynamics');
        const result = await connector.testConnection(DYNAMICS_CREDS);

        expect(result.success).toBe(false);
    });

    it('fetchMetrics: returns empty array when OAuth2 fails', async () => {
        global.fetch = mockFetch([
            { ok: false, text: 'Unauthorized' },
        ]);

        const connector = getConnector('dynamics');
        const result = await connector.fetchMetrics(DYNAMICS_CREDS, '2025-01-01', '2025-01-31');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    it('fetchMetrics: returns NormalizedDailyMetrics[] with correct shape', async () => {
        global.fetch = mockFetch([
            // OAuth2 token
            { ok: true, json: { access_token: 'token-xyz', token_type: 'Bearer', expires_in: 3600 } },
            // Sales invoices (customerLedgerEntries)
            { ok: true, json: { value: [
                { postingDate: '2025-01-15', salesAmount: 20000, amount: 20000, currencyCode: 'SAR' }
            ]}},
            // Purchase invoices (vendorLedgerEntries)
            { ok: true, json: { value: [
                { postingDate: '2025-01-15', purchaseAmount: 12000, amount: 12000, currencyCode: 'SAR' }
            ]}},
            // Cash receipts (bankAccountLedgerEntries inflow)
            { ok: true, json: { value: [
                { postingDate: '2025-01-15', amount: 15000 }
            ]}},
            // Cash disbursements (bankAccountLedgerEntries outflow)
            { ok: true, json: { value: [
                { postingDate: '2025-01-15', amount: 10000 }
            ]}},
        ]);

        const connector = getConnector('dynamics');
        const result = await connector.fetchMetrics(DYNAMICS_CREDS, '2025-01-01', '2025-01-31');

        assertNormalizedMetrics(result);
    });
});
