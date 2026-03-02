/**
 * THABAT ERP Connector Interface
 *
 * All connectors MUST output data in the Internal Normalized Schema.
 * NO ERP-specific logic is allowed in the Core Scoring Engine.
 */

export type ERPProvider = 'odoo' | 'sap' | 'dynamics';

/**
 * Internal Normalized Schema — the ONLY output format
 * from any connector into the scoring engine.
 */
export interface NormalizedDailyMetrics {
    date: string;            // YYYY-MM-DD
    cashBalance: number;     // SAR
    revenue: number;         // SAR
    expenses: number;        // SAR
    receivables: number;     // SAR
    payables: number;        // SAR
    currency?: string;       // Original currency (e.g. 'AED')
    exchangeRate?: number;   // Rate to Executive Currency (SAR)
    vatAmount?: number;      // VAT portion of expenses
}

/**
 * Credentials required per ERP type.
 */
export interface OdooCredentials {
    provider: 'odoo';
    url: string;             // e.g. https://mycompany.odoo.com
    database: string;
    username: string;
    apiKey: string;
}

export interface SAPCredentials {
    provider: 'sap';
    serviceLayerUrl: string; // e.g. https://myserver:50000/b1s/v1
    companyDB: string;
    username: string;
    password: string;
}

export interface DynamicsCredentials {
    provider: 'dynamics';
    tenantId: string;
    clientId: string;
    clientSecret: string;
    environment: string;     // e.g. 'production' or 'sandbox'
    company: string;         // company name or ID
}

export type ERPCredentials = OdooCredentials | SAPCredentials | DynamicsCredentials;

/**
 * Connection test result
 */
export interface ConnectionTestResult {
    success: boolean;
    message: string;
    provider: ERPProvider;
}

/**
 * Sync result
 */
export interface SyncResult {
    success: boolean;
    provider: ERPProvider;
    recordsProcessed: number;
    dateRange: { from: string; to: string };
    message: string;
}

/**
 * Base Connector Interface — every ERP module must implement this.
 */
export interface ERPConnector {
    /** Test the connection with provided credentials */
    testConnection(credentials: ERPCredentials): Promise<ConnectionTestResult>;

    /** Fetch and normalize metrics for a date range */
    fetchMetrics(
        credentials: ERPCredentials,
        fromDate: string,
        toDate: string
    ): Promise<NormalizedDailyMetrics[]>;
}

/**
 * Credential field definitions for the Connection Wizard UI
 */
export interface CredentialField {
    key: string;
    labelEN: string;
    labelAR: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
    required: boolean;
}

export const ERP_CONFIGS: Record<ERPProvider, {
    nameEN: string;
    nameAR: string;
    descEN: string;
    descAR: string;
    icon: string;
    fields: CredentialField[];
}> = {
    odoo: {
        nameEN: 'Odoo',
        nameAR: 'أودو',
        descEN: 'Connect to Odoo ERP via XML-RPC API',
        descAR: 'الاتصال بنظام أودو عبر واجهة XML-RPC',
        icon: '🟣',
        fields: [
            { key: 'url', labelEN: 'Server URL', labelAR: 'رابط الخادم', type: 'url', placeholder: 'https://mycompany.odoo.com', required: true },
            { key: 'database', labelEN: 'Database', labelAR: 'قاعدة البيانات', type: 'text', placeholder: 'mycompany_db', required: true },
            { key: 'username', labelEN: 'Username', labelAR: 'اسم المستخدم', type: 'text', placeholder: 'admin@company.com', required: true },
            { key: 'apiKey', labelEN: 'API Key', labelAR: 'مفتاح API', type: 'password', placeholder: '••••••••', required: true },
        ],
    },
    sap: {
        nameEN: 'SAP Business One',
        nameAR: 'ساب بزنس ون',
        descEN: 'Connect via SAP Service Layer REST API',
        descAR: 'الاتصال عبر واجهة Service Layer REST',
        icon: '🔷',
        fields: [
            { key: 'serviceLayerUrl', labelEN: 'Service Layer URL', labelAR: 'رابط Service Layer', type: 'url', placeholder: 'https://server:50000/b1s/v1', required: true },
            { key: 'companyDB', labelEN: 'Company Database', labelAR: 'قاعدة بيانات الشركة', type: 'text', placeholder: 'SBODemo_US', required: true },
            { key: 'username', labelEN: 'Username', labelAR: 'اسم المستخدم', type: 'text', placeholder: 'manager', required: true },
            { key: 'password', labelEN: 'Password', labelAR: 'كلمة المرور', type: 'password', placeholder: '••••••••', required: true },
        ],
    },
    dynamics: {
        nameEN: 'Microsoft Dynamics 365',
        nameAR: 'مايكروسوفت دايناميكس ٣٦٥',
        descEN: 'Connect via Azure OAuth2 & OData API v2.0',
        descAR: 'الاتصال عبر Azure OAuth2 وواجهة OData v2.0',
        icon: '🟦',
        fields: [
            { key: 'tenantId', labelEN: 'Azure Tenant ID', labelAR: 'معرف Azure Tenant', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
            { key: 'clientId', labelEN: 'Client ID', labelAR: 'معرف العميل', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
            { key: 'clientSecret', labelEN: 'Client Secret', labelAR: 'سر العميل', type: 'password', placeholder: '••••••••', required: true },
            { key: 'environment', labelEN: 'Environment', labelAR: 'البيئة', type: 'text', placeholder: 'production', required: true },
            { key: 'company', labelEN: 'Company Name', labelAR: 'اسم الشركة', type: 'text', placeholder: 'CRONUS International', required: true },
        ],
    },
};
