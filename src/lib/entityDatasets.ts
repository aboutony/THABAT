/**
 * Entity Data Fabric — 8 Sovereign LoBs (Command #48)
 *
 * Per-entity constants for:
 *   - Client Constellation (stars + health scoring)
 *   - Expense Waterfall    (cost rates + historical factors)
 *   - Stock-at-Risk gap    (inventory / resource state)
 *   - Nitaqat compliance tier
 *   - Constellation lines between star indices
 *
 * Cost rates must satisfy: Σ variable = 0.72, Σ fixed = 0.10 (matching forecast.ts).
 * histFactor < 0.87 (i.e., > 15% over moving-average) → triggers Waterfall pulse.
 */

import { calculateClientHealth, type ClientRecord, type ClientHealthResult } from './calculateClientHealth';
import type { StockGapInput } from './stockGap';
import type { NitaqatTierKey } from './ledger';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EntityCostRates {
    rawMaterials: { variable: number; fixed: number };
    logistics:    { variable: number; fixed: number };
    people:       { variable: number; fixed: number };
    govt:         { variable: number; fixed: number };
}

export interface EntityHistFactors {
    rawMaterials: number; // 1.0 = on-trend; < 0.87 → pulse + action
    logistics:    number;
    people:       number;
    govt:         number;
}

export interface EntityStockGap {
    input:            StockGapInput;
    nextShipmentDays: number;
}

export interface EntityDataset {
    clients:            ClientRecord[];
    costRates:          EntityCostRates;
    histFactors:        EntityHistFactors;
    stockGap:           EntityStockGap;
    nitaqatTier:        NitaqatTierKey;
    /** Constellation connecting lines: pairs of client-array indices */
    constellationLines: Array<[number, number]>;
}

// ── ENT_01: The Digital Transformation Agency ─────────────────────────────────
// Pain: Utilization / Billable Hours. OEE Target: 84%.
// People cost dominant. histFactors.people under threshold → pulse.

const ENT_01_CLIENTS: ClientRecord[] = [
    {
        id: 'aramco-it',
        name: { en: 'Saudi Aramco IT', ar: 'أرامكو السعودية - تقنية' },
        acv: 2400000,
        monthlyOrders: [201000, 198000, 194000],
        avgDaysOverdue: 5,
        engagementScore: 92,
        starX: 52, starY: 22,
    },
    {
        id: 'stc',
        name: { en: 'STC', ar: 'الاتصالات السعودية' },
        acv: 1850000,
        monthlyOrders: [158000, 156000, 153000],
        avgDaysOverdue: 8,
        engagementScore: 85,
        starX: 148, starY: 32,
    },
    {
        id: 'sama',
        name: { en: 'SAMA Digital', ar: 'مؤسسة النقد - رقمي' },
        acv: 1650000,
        monthlyOrders: [102000, 112000, 125000],  // declining
        avgDaysOverdue: 19,
        engagementScore: 55,
        starX: 242, starY: 48,
    },
    {
        id: 'mof-digital',
        name: { en: 'Ministry of Finance', ar: 'وزارة المالية' },
        acv: 1100000,
        monthlyOrders: [92000, 90000, 88000],
        avgDaysOverdue: 12,
        engagementScore: 74,
        starX: 110, starY: 58,
    },
    {
        id: 'elm',
        name: { en: 'Elm Company', ar: 'إيلم' },
        acv: 920000,
        monthlyOrders: [62000, 72000, 84000],     // significant decline
        avgDaysOverdue: 24,
        engagementScore: 44,
        starX: 74, starY: 90,
    },
    {
        id: 'neom-tech',
        name: { en: 'NEOM Technologies', ar: 'نيوم للتقنية' },
        acv: 780000,
        monthlyOrders: [48000, 58000, 70000],     // sharp decline
        avgDaysOverdue: 32,
        engagementScore: 36,
        starX: 196, starY: 98,
    },
    {
        id: 'nic',
        name: { en: 'National Info Center', ar: 'مركز المعلومات الوطني' },
        acv: 590000,
        monthlyOrders: [30000, 40000, 50000],     // sharp decline
        avgDaysOverdue: 40,
        engagementScore: 26,
        starX: 290, starY: 82,
    },
    {
        id: 'saudi-post-digital',
        name: { en: 'Saudi Post Digital', ar: 'البريد السعودي الرقمي' },
        acv: 460000,
        monthlyOrders: [28000, 32000, 36000],
        avgDaysOverdue: 15,
        engagementScore: 62,
        starX: 320, starY: 42,
    },
];

// ── ENT_02: The Medical Equipment Factory ─────────────────────────────────────
// Pain: Supply Chain / SAP Integration. Height: 320mm scroll.
// Raw materials dominant. histFactors.logistics over threshold → pulse.

const ENT_02_CLIENTS: ClientRecord[] = [
    {
        id: 'moh',
        name: { en: 'Ministry of Health', ar: 'وزارة الصحة' },
        acv: 2100000,
        monthlyOrders: [178000, 175000, 172000],
        avgDaysOverdue: 7,
        engagementScore: 88,
        starX: 155, starY: 38,
    },
    {
        id: 'nupco',
        name: { en: 'NUPCO', ar: 'نوبكو' },
        acv: 1053000,
        monthlyOrders: [89000, 87500, 86000],
        avgDaysOverdue: 5,
        engagementScore: 91,
        starX: 48, starY: 28,
    },
    {
        id: 'ng-health',
        name: { en: 'National Guard Health', ar: 'صحة الحرس الوطني' },
        acv: 980000,
        monthlyOrders: [78000, 80000, 79000],
        avgDaysOverdue: 14,
        engagementScore: 70,
        starX: 108, starY: 62,
    },
    {
        id: 'kfsh',
        name: { en: 'King Faisal Specialist', ar: 'الملك فيصل التخصصي' },
        acv: 1350000,
        monthlyOrders: [82000, 95000, 112000],    // declining
        avgDaysOverdue: 22,
        engagementScore: 42,
        starX: 248, starY: 55,
    },
    {
        id: 'sgh',
        name: { en: 'Saudi German Hospital', ar: 'السعودي الألماني' },
        acv: 890000,
        monthlyOrders: [54000, 61000, 72000],     // significant decline
        avgDaysOverdue: 18,
        engagementScore: 48,
        starX: 72, starY: 94,
    },
    {
        id: 'al-rajhi-medical',
        name: { en: 'Al Rajhi Medical', ar: 'مستشفى الراجحي' },
        acv: 720000,
        monthlyOrders: [42000, 55000, 68000],     // sharp decline
        avgDaysOverdue: 31,
        engagementScore: 35,
        starX: 192, starY: 102,
    },
    {
        id: 'al-bilad',
        name: { en: 'Al-Bilad Hospital', ar: 'مستشفى البلاد' },
        acv: 540000,
        monthlyOrders: [28000, 38000, 46000],     // sharp decline
        avgDaysOverdue: 38,
        engagementScore: 28,
        starX: 296, starY: 88,
    },
];

// ── ENT_03: The Hygienic Product Manufacturer ─────────────────────────────────
// Pain: ZATCA Phase 2 / Logistics (+15% material stress).
// Both raw materials and logistics over threshold → dual pulse.

const ENT_03_CLIENTS: ClientRecord[] = [
    {
        id: 'panda-national',
        name: { en: 'Panda Retail - National Distribution', ar: 'بنده - التوزيع الوطني' },
        acv: 2450000,
        monthlyOrders: [225000, 221000, 218000],
        avgDaysOverdue: 7,
        engagementScore: 90,
        starX: 148, starY: 34,
    },
    {
        id: 'nahdi-medical',
        name: { en: 'Nahdi Medical', ar: 'النهدي الطبية' },
        acv: 1820000,
        monthlyOrders: [168000, 165000, 162000],
        avgDaysOverdue: 9,
        engagementScore: 87,
        starX: 54, starY: 24,
    },
    {
        id: 'danube-markets',
        name: { en: 'Danube Markets', ar: 'أسواق الدانوب' },
        acv: 1340000,
        monthlyOrders: [129000, 125000, 121000],
        avgDaysOverdue: 12,
        engagementScore: 82,
        starX: 108, starY: 62,
    },
    {
        id: 'al-dawaa',
        name: { en: 'Al-Dawaa Pharmacies', ar: 'صيدليات الدواء' },
        acv: 1120000,
        monthlyOrders: [98000, 110000, 126000],   // declining
        avgDaysOverdue: 23,
        engagementScore: 54,
        starX: 246, starY: 50,
    },
    {
        id: 'al-othaim',
        name: { en: 'Al Othaim Markets', ar: 'أسواق العثيم' },
        acv: 980000,
        monthlyOrders: [86000, 98000, 112000],    // significant decline
        avgDaysOverdue: 27,
        engagementScore: 46,
        starX: 76, starY: 92,
    },
    {
        id: 'tamimi-markets',
        name: { en: 'Tamimi Markets', ar: 'أسواق التميمي' },
        acv: 740000,
        monthlyOrders: [64000, 76000, 92000],     // sharp decline
        avgDaysOverdue: 34,
        engagementScore: 38,
        starX: 196, starY: 100,
    },
    {
        id: 'carrefour-sa',
        name: { en: 'Carrefour Saudi', ar: 'كارفور السعودية' },
        acv: 690000,
        monthlyOrders: [58000, 69000, 83000],     // sharp decline
        avgDaysOverdue: 31,
        engagementScore: 41,
        starX: 294, starY: 84,
    },
];

// ── ENT_04: The Pharmacies Chain ──────────────────────────────────────────────
// Pain: Inventory Churn / Nitaqat. Stars: 12 Active Nodes. nitaqatTier: 'red'.

const ENT_04_CLIENTS: ClientRecord[] = [
    {
        id: 'moh-pharmacy',
        name: { en: 'MOH Central Pharmacy', ar: 'الصيدلية المركزية - الصحة' },
        acv: 1600000,
        monthlyOrders: [135000, 132000, 130000],
        avgDaysOverdue: 6,
        engagementScore: 89,
        starX: 170, starY: 20,
    },
    {
        id: 'nupco-supply',
        name: { en: 'NUPCO Supply', ar: 'نوبكو للتوريدات' },
        acv: 1200000,
        monthlyOrders: [100000, 98000, 96000],
        avgDaysOverdue: 8,
        engagementScore: 86,
        starX: 40, starY: 18,
    },
    {
        id: 'tawuniya',
        name: { en: 'Tawuniya Insurance', ar: 'التعاونية' },
        acv: 1050000,
        monthlyOrders: [88000, 86000, 84000],
        avgDaysOverdue: 9,
        engagementScore: 82,
        starX: 295, starY: 30,
    },
    {
        id: 'al-mushtarak',
        name: { en: 'Al Mushtarak Insurance', ar: 'المشترك للتأمين' },
        acv: 950000,
        monthlyOrders: [78000, 80000, 79000],
        avgDaysOverdue: 12,
        engagementScore: 75,
        starX: 100, starY: 45,
    },
    {
        id: 'dallah',
        name: { en: 'Dallah Hospital', ar: 'مستشفى دلة' },
        acv: 690000,
        monthlyOrders: [55000, 57000, 55000],
        avgDaysOverdue: 14,
        engagementScore: 70,
        starX: 240, starY: 40,
    },
    {
        id: 'sgh-pharmacy',
        name: { en: 'SGH Pharmacy', ar: 'صيدلية السعودي الألماني' },
        acv: 820000,
        monthlyOrders: [68000, 67000, 65000],
        avgDaysOverdue: 10,
        engagementScore: 79,
        starX: 60, starY: 75,
    },
    {
        id: 'al-hana',
        name: { en: 'Al Hana Medical', ar: 'الهناء الطبي' },
        acv: 540000,
        monthlyOrders: [42000, 44000, 50000],     // declining
        avgDaysOverdue: 22,
        engagementScore: 58,
        starX: 200, starY: 65,
    },
    {
        id: 'ibn-sina',
        name: { en: 'Ibn Sina Hospital', ar: 'مستشفى ابن سينا' },
        acv: 480000,
        monthlyOrders: [37000, 44000, 52000],     // significant decline
        avgDaysOverdue: 26,
        engagementScore: 48,
        starX: 140, starY: 85,
    },
    {
        id: 'al-rayan',
        name: { en: 'Al Rayan Hospital', ar: 'مستشفى الريان' },
        acv: 420000,
        monthlyOrders: [30000, 38000, 47000],
        avgDaysOverdue: 30,
        engagementScore: 42,
        starX: 310, starY: 70,
    },
    {
        id: 'al-thiqah',
        name: { en: 'Al Thiqah Club', ar: 'نادي الثقة' },
        acv: 310000,
        monthlyOrders: [22000, 27000, 33000],
        avgDaysOverdue: 18,
        engagementScore: 61,
        starX: 80, starY: 110,
    },
    {
        id: 'al-mana',
        name: { en: 'Al Mana Healthcare', ar: 'المانع للرعاية' },
        acv: 360000,
        monthlyOrders: [25000, 30000, 36000],
        avgDaysOverdue: 35,
        engagementScore: 38,
        starX: 260, starY: 95,
    },
    {
        id: 'al-ameen',
        name: { en: 'Al Ameen Hospital', ar: 'مستشفى الأمين' },
        acv: 290000,
        monthlyOrders: [18000, 24000, 30000],     // decline
        avgDaysOverdue: 40,
        engagementScore: 30,
        starX: 175, starY: 108,
    },
];

// ── ENT_05: The Real-Estate Developer ─────────────────────────────────────────
// Pain: Contractor Friction / GOSI. Radar: 3 Red Blips.
// histFactors.govt over threshold (GOSI pressure) → pulse.

const ENT_05_CLIENTS: ClientRecord[] = [
    {
        id: 'pif-real-estate',
        name: { en: 'PIF Real Estate', ar: 'صندوق الاستثمارات - عقارات' },
        acv: 4100000,
        monthlyOrders: [342000, 338000, 332000],
        avgDaysOverdue: 6,
        engagementScore: 90,
        starX: 55, starY: 20,
    },
    {
        id: 'moh-housing',
        name: { en: 'Ministry of Housing', ar: 'وزارة الإسكان' },
        acv: 3200000,
        monthlyOrders: [268000, 265000, 260000],
        avgDaysOverdue: 9,
        engagementScore: 83,
        starX: 160, starY: 30,
    },
    {
        id: 'roshn',
        name: { en: 'Roshn Developments', ar: 'روشن للتطوير' },
        acv: 2200000,
        monthlyOrders: [176000, 178000, 175000],
        avgDaysOverdue: 14,
        engagementScore: 71,
        starX: 80, starY: 100,
    },
    {
        id: 'neom-land',
        name: { en: 'NEOM Land', ar: 'نيوم - أراضي' },
        acv: 2600000,
        monthlyOrders: [180000, 195000, 215000],  // declining
        avgDaysOverdue: 24,
        engagementScore: 54,
        starX: 275, starY: 45,
    },
    {
        id: 'saudi-binladin',
        name: { en: 'Saudi Binladin Group', ar: 'مجموعة بن لادن' },
        acv: 1800000,
        monthlyOrders: [128000, 144000, 165000],  // significant decline
        avgDaysOverdue: 31,
        engagementScore: 40,
        starX: 108, starY: 65,
    },
    {
        id: 'ccc',
        name: { en: 'Consolidated Contractors', ar: 'المقاولون المتحدون' },
        acv: 1400000,
        monthlyOrders: [88000, 104000, 122000],   // sharp decline
        avgDaysOverdue: 38,
        engagementScore: 32,
        starX: 220, starY: 80,
    },
    {
        id: 'al-futtaim',
        name: { en: 'Al-Futtaim Construction', ar: 'الفطيم للمقاولات' },
        acv: 1100000,
        monthlyOrders: [75000, 90000, 108000],    // decline
        avgDaysOverdue: 28,
        engagementScore: 46,
        starX: 300, starY: 90,
    },
];

// ── ENT_06: The Hospital ───────────────────────────────────────────────────────
// Pain: Patient Throughput / Bed Efficiency. Briefing: Data Fabric focus.
// nitaqatTier: 'platinum'. People cost over threshold → pulse (staffing strain).

const ENT_06_CLIENTS: ClientRecord[] = [
    {
        id: 'moh-insurance',
        name: { en: 'MOH Insurance', ar: 'تأمين وزارة الصحة' },
        acv: 2800000,
        monthlyOrders: [235000, 232000, 228000],
        avgDaysOverdue: 8,
        engagementScore: 87,
        starX: 162, starY: 28,
    },
    {
        id: 'tawuniya-health',
        name: { en: 'Tawuniya Insurance', ar: 'التعاونية للتأمين' },
        acv: 1900000,
        monthlyOrders: [158000, 156000, 152000],
        avgDaysOverdue: 5,
        engagementScore: 93,
        starX: 50, starY: 22,
    },
    {
        id: 'bupa-saudi',
        name: { en: 'Bupa Arabia', ar: 'بوبا العربية' },
        acv: 2200000,
        monthlyOrders: [184000, 181000, 178000],
        avgDaysOverdue: 7,
        engagementScore: 89,
        starX: 280, starY: 38,
    },
    {
        id: 'aramco-medical',
        name: { en: 'Saudi Aramco Medical', ar: 'أرامكو الطبي' },
        acv: 1600000,
        monthlyOrders: [120000, 124000, 136000],  // declining
        avgDaysOverdue: 20,
        engagementScore: 57,
        starX: 112, starY: 60,
    },
    {
        id: 'ng-health-ins',
        name: { en: 'National Guard Health', ar: 'صحة الحرس الوطني' },
        acv: 1300000,
        monthlyOrders: [96000, 108000, 122000],   // significant decline
        avgDaysOverdue: 25,
        engagementScore: 46,
        starX: 230, starY: 65,
    },
    {
        id: 'aman',
        name: { en: 'AMAN Insurance', ar: 'أمان للتأمين' },
        acv: 880000,
        monthlyOrders: [56000, 66000, 78000],     // sharp decline
        avgDaysOverdue: 33,
        engagementScore: 37,
        starX: 75, starY: 96,
    },
    {
        id: 'walaa',
        name: { en: 'Walaa Insurance', ar: 'ولاء للتأمين' },
        acv: 720000,
        monthlyOrders: [44000, 54000, 64000],
        avgDaysOverdue: 28,
        engagementScore: 42,
        starX: 310, starY: 80,
    },
    {
        id: 'al-ahli-takaful',
        name: { en: 'Al Ahli Takaful', ar: 'الأهلي للتكافل' },
        acv: 600000,
        monthlyOrders: [36000, 42000, 50000],
        avgDaysOverdue: 15,
        engagementScore: 65,
        starX: 190, starY: 105,
    },
];

// ── ENT_07: The Food Processing Manufacturer ──────────────────────────────────
// Pain: Energy Costs / Packaging Waste. Sovereign Gold: High Priority.
// histFactors.logistics over threshold (energy/packaging) → pulse.

const ENT_07_CLIENTS: ClientRecord[] = [
    {
        id: 'panda',
        name: { en: 'Panda Retail', ar: 'بنده للتجزئة' },
        acv: 2200000,
        monthlyOrders: [184000, 188000, 202000],  // declining
        avgDaysOverdue: 21,
        engagementScore: 53,
        starX: 108, starY: 62,
    },
    {
        id: 'tamimi',
        name: { en: 'Tamimi Markets', ar: 'أسواق التميمي' },
        acv: 1950000,
        monthlyOrders: [164000, 161000, 158000],
        avgDaysOverdue: 7,
        engagementScore: 86,
        starX: 155, starY: 32,
    },
    {
        id: 'danube',
        name: { en: 'Danube Markets', ar: 'الدانوب' },
        acv: 1600000,
        monthlyOrders: [134000, 132000, 128000],
        avgDaysOverdue: 9,
        engagementScore: 82,
        starX: 52, starY: 24,
    },
    {
        id: 'carrefour-sa',
        name: { en: 'Carrefour Saudi', ar: 'كارفور السعودية' },
        acv: 1800000,
        monthlyOrders: [138000, 154000, 172000],  // significant decline
        avgDaysOverdue: 28,
        engagementScore: 44,
        starX: 252, starY: 52,
    },
    {
        id: 'othaim',
        name: { en: 'Al Othaim Markets', ar: 'العثيم' },
        acv: 1400000,
        monthlyOrders: [112000, 114000, 112000],
        avgDaysOverdue: 11,
        engagementScore: 76,
        starX: 298, starY: 86,
    },
    {
        id: 'savola',
        name: { en: 'Savola Foods', ar: 'صافولا' },
        acv: 980000,
        monthlyOrders: [68000, 80000, 94000],     // sharp decline
        avgDaysOverdue: 35,
        engagementScore: 35,
        starX: 78, starY: 95,
    },
    {
        id: 'al-jazira',
        name: { en: 'Al-Jazirah Est.', ar: 'الجزيرة' },
        acv: 740000,
        monthlyOrders: [44000, 56000, 68000],
        avgDaysOverdue: 22,
        engagementScore: 50,
        starX: 198, starY: 100,
    },
];

// ── ENT_08: The F&B Distributor ───────────────────────────────────────────────
// Pain: Fleet Utilization / Fuel Sensitivity. Action: WhatsApp Signal focus.
// Logistics drastically over threshold (35%+) → PULSE.

const ENT_08_CLIENTS: ClientRecord[] = [
    {
        id: 'mcdonalds-sa',
        name: { en: "McDonald's Saudi", ar: 'ماكدونالدز السعودية' },
        acv: 2100000,
        monthlyOrders: [176000, 173000, 170000],
        avgDaysOverdue: 6,
        engagementScore: 91,
        starX: 158, starY: 30,
    },
    {
        id: 'kudu',
        name: { en: 'Kudu Restaurant', ar: 'كودو' },
        acv: 1400000,
        monthlyOrders: [118000, 116000, 113000],
        avgDaysOverdue: 9,
        engagementScore: 85,
        starX: 50, starY: 20,
    },
    {
        id: 'alshaya-fb',
        name: { en: 'Alshaya F&B', ar: 'الشايع - مطاعم' },
        acv: 1750000,
        monthlyOrders: [128000, 144000, 162000],  // declining
        avgDaysOverdue: 23,
        engagementScore: 51,
        starX: 110, starY: 62,
    },
    {
        id: 'pizza-hut-sa',
        name: { en: 'Pizza Hut Saudi', ar: 'بيتزا هت السعودية' },
        acv: 980000,
        monthlyOrders: [82000, 84000, 88000],
        avgDaysOverdue: 15,
        engagementScore: 72,
        starX: 285, starY: 35,
    },
    {
        id: 'marriott-sa',
        name: { en: 'Marriott Saudi', ar: 'ماريوت السعودية' },
        acv: 1100000,
        monthlyOrders: [70000, 85000, 102000],    // sharp decline
        avgDaysOverdue: 36,
        engagementScore: 33,
        starX: 78, starY: 98,
    },
    {
        id: 'dur-hotels',
        name: { en: 'Dur Hospitality', ar: 'دار للضيافة' },
        acv: 820000,
        monthlyOrders: [55000, 66000, 78000],     // significant decline
        avgDaysOverdue: 30,
        engagementScore: 40,
        starX: 225, starY: 75,
    },
    {
        id: 'al-tazaj',
        name: { en: 'Al Tazaj Restaurant', ar: 'الطازج' },
        acv: 560000,
        monthlyOrders: [34000, 42000, 52000],
        avgDaysOverdue: 18,
        engagementScore: 62,
        starX: 310, starY: 88,
    },
];

// ── Central Dataset Registry ───────────────────────────────────────────────────
// variable rates must sum to 0.72, fixed to 0.10 per entity

export const ENTITY_DATASETS: Record<string, EntityDataset> = {

    'ENT_01': {
        clients: ENT_01_CLIENTS,
        costRates: {
            // Tech agency: people = billable hours dominant; light on materials
            rawMaterials: { variable: 0.10, fixed: 0.00 },  // cloud + licenses
            logistics:    { variable: 0.03, fixed: 0.00 },  // minimal delivery
            people:       { variable: 0.55, fixed: 0.07 },  // consultants + engineers
            govt:         { variable: 0.04, fixed: 0.03 },  // Vision 2030 compliance
        },
        histFactors: {
            rawMaterials: 0.94,   //  6% over → no pulse
            logistics:    0.96,   //  4% over → no pulse
            people:       0.82,   // 22% over → PULSE (utilisation gap vs OEE 84% target)
            govt:         0.95,   //  5% over → no pulse
        },
        stockGap: {
            // Resource pipeline (talent/licenses), not physical stock
            input: { stockDays: 8, avgLeadTimeDays: 6, dailySalesVelocity: 0, onHandUnits: 0 },
            nextShipmentDays: 5,
        },
        nitaqatTier:        'platinum',
        constellationLines: [[0, 1], [0, 3], [1, 3], [2, 3], [4, 5]],
    },

    'ENT_02': {
        clients: ENT_02_CLIENTS,
        costRates: {
            // Medical device factory: imported components heavy
            rawMaterials: { variable: 0.43, fixed: 0.00 },
            logistics:    { variable: 0.14, fixed: 0.00 },  // 19% over → PULSE
            people:       { variable: 0.11, fixed: 0.03 },
            govt:         { variable: 0.04, fixed: 0.07 },
        },
        histFactors: {
            rawMaterials: 0.97,   //  3% over → no pulse
            logistics:    0.84,   // 19% over → PULSE (SAP integration delay)
            people:       0.98,   //  2% over → no pulse
            govt:         0.94,   //  6% over → no pulse
        },
        stockGap: {
            input: { stockDays: 4, avgLeadTimeDays: 14.8, dailySalesVelocity: 12, onHandUnits: 48 },
            nextShipmentDays: 9,
        },
        nitaqatTier:        'lowGreen',
        constellationLines: [[0, 1], [0, 2], [2, 3], [2, 4], [0, 3]],
    },

    'ENT_03': {
        clients: ENT_03_CLIENTS,
        costRates: {
            // Hygienic products: absorbent inputs and national distribution dominate cost
            rawMaterials: { variable: 0.42, fixed: 0.00 },
            logistics:    { variable: 0.18, fixed: 0.00 },
            people:       { variable: 0.09, fixed: 0.03 },
            govt:         { variable: 0.03, fixed: 0.07 },
        },
        histFactors: {
            rawMaterials: 0.85,   // 18% over → PULSE (absorbent inputs)
            logistics:    0.88,   // 14% over → watch (regional replenishment)
            people:       0.96,   //  4% over → no pulse
            govt:         0.94,   //  6% over → no pulse
        },
        stockGap: {
            input: { stockDays: 6, avgLeadTimeDays: 11.4, dailySalesVelocity: 42, onHandUnits: 252 },
            nextShipmentDays: 5,
        },
        nitaqatTier:        'highGreen',
        constellationLines: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5]],
    },

    'ENT_04': {
        clients: ENT_04_CLIENTS,
        costRates: {
            // Pharmacy chain: drug procurement = dominant cost (inventory churn)
            rawMaterials: { variable: 0.50, fixed: 0.00 },
            logistics:    { variable: 0.10, fixed: 0.00 },
            people:       { variable: 0.10, fixed: 0.04 },
            govt:         { variable: 0.02, fixed: 0.06 },
        },
        histFactors: {
            rawMaterials: 0.86,   // 16% over → PULSE (inventory churn)
            logistics:    0.92,   //  9% over → no pulse
            people:       0.96,   //  4% over → no pulse
            govt:         0.91,   // 10% over → no pulse
        },
        stockGap: {
            input: { stockDays: 3, avgLeadTimeDays: 8, dailySalesVelocity: 24, onHandUnits: 72 },
            nextShipmentDays: 6,
        },
        nitaqatTier:        'red',
        constellationLines: [
            [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,0],
        ],
    },

    'ENT_05': {
        clients: ENT_05_CLIENTS,
        costRates: {
            // Real-estate: construction materials + heavy GOSI (contractor workforce)
            rawMaterials: { variable: 0.38, fixed: 0.00 },
            logistics:    { variable: 0.14, fixed: 0.00 },
            people:       { variable: 0.14, fixed: 0.03 },
            govt:         { variable: 0.06, fixed: 0.07 },  // GOSI heavy
        },
        histFactors: {
            rawMaterials: 0.90,   // 11% over → no pulse
            logistics:    0.91,   // 10% over → no pulse
            people:       0.90,   // 11% over → no pulse
            govt:         0.79,   // 27% over → PULSE (GOSI contractor friction)
        },
        stockGap: {
            input: { stockDays: 15, avgLeadTimeDays: 30, dailySalesVelocity: 5, onHandUnits: 75 },
            nextShipmentDays: 22,
        },
        nitaqatTier:        'lowGreen',
        constellationLines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5]],
    },

    'ENT_06': {
        clients: ENT_06_CLIENTS,
        costRates: {
            // Hospital: staffing dominant (doctors + nurses + admin)
            rawMaterials: { variable: 0.20, fixed: 0.00 },  // medical supplies
            logistics:    { variable: 0.07, fixed: 0.00 },
            people:       { variable: 0.40, fixed: 0.07 },  // staff-heavy
            govt:         { variable: 0.05, fixed: 0.03 },
        },
        histFactors: {
            rawMaterials: 0.93,   //  8% over → no pulse
            logistics:    0.95,   //  5% over → no pulse
            people:       0.84,   // 19% over → PULSE (patient throughput stress)
            govt:         0.97,   //  3% over → no pulse
        },
        stockGap: {
            input: { stockDays: 5, avgLeadTimeDays: 10, dailySalesVelocity: 15, onHandUnits: 75 },
            nextShipmentDays: 8,
        },
        nitaqatTier:        'platinum',
        constellationLines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6]],
    },

    'ENT_07': {
        clients: ENT_07_CLIENTS,
        costRates: {
            // Food manufacturer: raw ingredients + energy/packaging (logistics)
            rawMaterials: { variable: 0.38, fixed: 0.00 },
            logistics:    { variable: 0.21, fixed: 0.00 },  // energy + packaging → PULSE
            people:       { variable: 0.09, fixed: 0.03 },
            govt:         { variable: 0.04, fixed: 0.07 },
        },
        histFactors: {
            rawMaterials: 0.95,   //  5% over → no pulse
            logistics:    0.82,   // 22% over → PULSE (energy cost spike)
            people:       0.98,   //  2% over → no pulse
            govt:         0.93,   //  8% over → no pulse
        },
        stockGap: {
            input: { stockDays: 7, avgLeadTimeDays: 9, dailySalesVelocity: 20, onHandUnits: 140 },
            nextShipmentDays: 6,
        },
        nitaqatTier:        'platinum',
        constellationLines: [[0, 1], [0, 2], [1, 3], [2, 4], [4, 5], [3, 6]],
    },

    'ENT_08': {
        clients: ENT_08_CLIENTS,
        costRates: {
            // F&B distributor: fleet dominates (fuel sensitivity critical)
            rawMaterials: { variable: 0.22, fixed: 0.00 },  // goods procurement
            logistics:    { variable: 0.42, fixed: 0.00 },  // fleet + fuel → PULSE
            people:       { variable: 0.07, fixed: 0.03 },
            govt:         { variable: 0.01, fixed: 0.07 },
        },
        histFactors: {
            rawMaterials: 0.96,   //  4% over → no pulse
            logistics:    0.74,   // 35% over → PULSE (fuel sensitivity critical)
            people:       0.98,   //  2% over → no pulse
            govt:         0.95,   //  5% over → no pulse
        },
        stockGap: {
            input: { stockDays: 4, avgLeadTimeDays: 7, dailySalesVelocity: 30, onHandUnits: 120 },
            nextShipmentDays: 5,
        },
        nitaqatTier:        'lowGreen',
        constellationLines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    },
};

// ── Convenience accessors ──────────────────────────────────────────────────────

/** Returns the dataset for the given entity ID, falling back to ENT_02. */
export function getEntityDataset(entityId: string): EntityDataset {
    return ENTITY_DATASETS[entityId] ?? ENTITY_DATASETS['ENT_02'];
}

/** Calculates client health scores for the active entity. */
export function getEntityClientHealth(entityId: string): ClientHealthResult[] {
    return calculateClientHealth(getEntityDataset(entityId).clients);
}

/** True if any client in the given entity has health < 60. */
export function hasEntityRetentionRisk(entityId: string): boolean {
    return getEntityClientHealth(entityId).some(c => c.isFlickering);
}

/** Returns at-risk clients sorted from weakest to strongest health. */
export function getEntityAtRiskClients(entityId: string): ClientHealthResult[] {
    return getEntityClientHealth(entityId)
        .filter(c => c.isFlickering)
        .sort((a, b) => a.healthScore - b.healthScore);
}

/** Maximum ACV across the active entity's clients (for star-size normalisation). */
export function getEntityMaxACV(entityId: string): number {
    const clients = getEntityDataset(entityId).clients;
    return Math.max(...clients.map(c => c.acv));
}

/** Returns entity-specific StockGap data (input + nextShipmentDays). */
export function getEntityStockGapData(entityId: string): EntityStockGap {
    return getEntityDataset(entityId).stockGap;
}

/** Returns entity-specific Nitaqat compliance tier. */
export function getEntityNitaqatTier(entityId: string): NitaqatTierKey {
    return getEntityDataset(entityId).nitaqatTier;
}
