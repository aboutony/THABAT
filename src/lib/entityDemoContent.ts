import type { WorkforceInput } from './nitaqat';

export interface LocalizedText {
    en: string;
    ar: string;
}

const DEFAULT_SUPPLY_CHAIN = {
    currentDay: 18,
    kpis: { avgLeadTime: 14.8, onTime: 73, friction: 8, activeShipments: 4 },
    shipments: [
        { id: 'SHP-2841', product: { en: 'Ultrasound Probe Array', ar: 'مجموعة مسابير الموجات فوق الصوتية' }, origin: 'Hamburg, DE', destination: { en: 'Riyadh', ar: 'الرياض' }, day: 18, status: 'transit' as const },
        { id: 'SHP-2840', product: { en: 'MRI Contrast Agent', ar: 'عامل تباين الرنين المغناطيسي' }, origin: 'Shanghai, CN', destination: { en: 'Jeddah', ar: 'جدة' }, day: 7, status: 'customs' as const },
        { id: 'SHP-2838', product: { en: 'Surgical Instrument Set', ar: 'طقم أدوات جراحية' }, origin: 'Boston, MA', destination: { en: 'Jeddah', ar: 'جدة' }, day: 29, status: 'delivered' as const },
        { id: 'SHP-2836', product: { en: 'Lab Analyzer Cartridges', ar: 'خراطيش محلل مختبري' }, origin: 'Stuttgart, DE', destination: { en: 'Riyadh', ar: 'الرياض' }, day: 3, status: 'transit' as const },
    ],
    riskSignals: [
        { tone: 'warn' as const, text: { en: 'Customs clearance delay detected on imported imaging inputs.', ar: 'تم رصد تأخر في التخليص الجمركي لمدخلات التصوير المستوردة.' } },
        { tone: 'info' as const, text: { en: 'Port congestion easing after weekend berth reslotting.', ar: 'بدأ ازدحام الميناء بالانخفاض بعد إعادة جدولة الأرصفة.' } },
    ],
};

const ENT_03_SUPPLY_CHAIN = {
    currentDay: 9,
    kpis: { avgLeadTime: 11.4, onTime: 81, friction: 5, activeShipments: 4 },
    shipments: [
        { id: 'SHP-3301', product: { en: 'Absorbent Polymer Resin', ar: 'راتنج البوليمر عالي الامتصاص' }, origin: 'Dammam Port', destination: { en: 'Riyadh Plant', ar: 'مصنع الرياض' }, day: 9, status: 'customs' as const },
        { id: 'SHP-3298', product: { en: 'Fluff Pulp Rolls', ar: 'لفات لب الزغب' }, origin: 'Jeddah Port', destination: { en: 'Riyadh Plant', ar: 'مصنع الرياض' }, day: 6, status: 'transit' as const },
        { id: 'SHP-3296', product: { en: 'BabyJoy Jumbo Pack Allocation', ar: 'تخصيص عبوات بيبي جوي الكبيرة' }, origin: 'Riyadh Plant', destination: { en: 'Jeddah Branch', ar: 'فرع جدة' }, day: 2, status: 'transit' as const },
        { id: 'SHP-3294', product: { en: 'Sofy Comfort Night Pads', ar: 'فوط سوفي كومفورت الليلية' }, origin: 'Riyadh Plant', destination: { en: 'Dammam DC', ar: 'مركز توزيع الدمام' }, day: 1, status: 'delivered' as const },
    ],
    riskSignals: [
        { tone: 'warn' as const, text: { en: 'Absorbent input lot remains at customs and is now below the safety buffer.', ar: 'شحنة المواد الماصة ما زالت في الجمارك وأصبحت دون هامش الأمان.' } },
        { tone: 'info' as const, text: { en: 'Western region BabyJoy demand is running ahead of branch allocation for this week.', ar: 'طلب بيبي جوي في المنطقة الغربية يتجاوز مخصصات الفروع لهذا الأسبوع.' } },
        { tone: 'warn' as const, text: { en: 'QA release is still pending on one skin-contact material batch.', ar: 'ما زال اعتماد الجودة معلقاً لدفعة من المواد الملامسة للبشرة.' } },
    ],
};

const DEFAULT_SALES_ORDER = {
    number: 'PO 4100000309',
    client: { en: 'NUPCO (National Unified Procurement Company)', ar: 'نوبكو (الشركة الوطنية الموحدة للشراء)' },
    baseRevenue: 1053000,
    unitPrice: 650,
    baseUnits: 1620,
    paymentTerms: 120,
    products: [
        { name: { en: 'Urological Catheter - Foley 2-Way', ar: 'قسطرة بولية - فولي ثنائية الاتجاه' }, sku: 'UC-F2W-16', unitPrice: 650, qty: 800 },
        { name: { en: 'Suture Braid Silk 2/0 - 75cm', ar: 'خيط جراحي حريري مجدول 2/0 - 75سم' }, sku: 'SBS-20-75', unitPrice: 469.9, qty: 600 },
        { name: { en: 'Surgical Drain - Jackson-Pratt', ar: 'مصرف جراحي - جاكسون برات' }, sku: 'SD-JP-400', unitPrice: 312.5, qty: 220 },
    ],
};

const ENT_03_SALES_ORDER = {
    number: 'PO BJ-2026-0412',
    client: { en: 'Panda Retail - National Distribution', ar: 'بنده - التوزيع الوطني' },
    baseRevenue: 1152000,
    unitPrice: 180,
    baseUnits: 6400,
    paymentTerms: 60,
    products: [
        { name: { en: 'BabyJoy Diapers - Jumbo Pack', ar: 'حفاضات بيبي جوي - عبوة كبيرة' }, sku: 'BJ-DJP-52', unitPrice: 182, qty: 2400 },
        { name: { en: 'BabyJoy Baby Wipes - Value Pack', ar: 'مناديل بيبي جوي - عبوة اقتصادية' }, sku: 'BJ-WVP-80', unitPrice: 64, qty: 1800 },
        { name: { en: 'Sofy Comfort Night Pads', ar: 'فوط سوفي كومفورت الليلية' }, sku: 'SF-CN-24', unitPrice: 38, qty: 1400 },
        { name: { en: 'Lifree Adult Pants - Medium', ar: 'ليفري سراويل للكبار - متوسط' }, sku: 'LF-AP-M', unitPrice: 97, qty: 800 },
    ],
};

const DEFAULT_RETENTION = {
    stats: { overallStability: 96.2, totalContractValue: 5393000, activeContracts: 4, recurringRevenue: 3480000, avgContractYears: 2.8 },
    contracts: [
        { id: 'nupco-fw', client: { en: 'NUPCO - National Unified Procurement', ar: 'نوبكو - الشركة الوطنية الموحدة للشراء' }, type: { en: 'Framework Agreement', ar: 'اتفاقية إطارية' }, value: 1053000, startDate: '2024-01-15', endDate: '2027-01-14', renewals: 3, daysRemaining: 312, status: 'stable' as const, stability: { en: 'Highly Stable', ar: 'مستقر للغاية' }, products: [ { name: { en: 'Urological Catheter - Foley 2-Way', ar: 'قسطرة بولية - فولي ثنائية الاتجاه' }, qty: 800, price: 650 }, { name: { en: 'Suture Braid Silk 2/0 - 75cm', ar: 'خيط جراحي حريري مجدول 2/0 - 75سم' }, qty: 600, price: 469.9 } ] },
        { id: 'moh-central', client: { en: 'MOH - Ministry of Health (Central)', ar: 'وزارة الصحة - الإدارة المركزية' }, type: { en: 'Direct Purchase Agreement', ar: 'اتفاقية شراء مباشر' }, value: 2100000, startDate: '2024-06-01', endDate: '2026-05-31', renewals: 1, daysRemaining: 454, status: 'stable' as const, stability: { en: 'Highly Stable', ar: 'مستقر للغاية' }, products: [ { name: { en: 'Urological Catheter - Foley 2-Way', ar: 'قسطرة بولية - فولي ثنائية الاتجاه' }, qty: 1200, price: 650 }, { name: { en: 'Surgical Drain - Jackson-Pratt', ar: 'مصرف جراحي - جاكسون برات' }, qty: 440, price: 312.5 } ] },
        { id: 'kfsh', client: { en: 'King Faisal Specialist Hospital', ar: 'مستشفى الملك فيصل التخصصي' }, type: { en: 'Tender Contract', ar: 'عقد مناقصة' }, value: 1350000, startDate: '2025-03-01', endDate: '2026-05-15', renewals: 2, daysRemaining: 72, status: 'expiring' as const, stability: { en: 'Renewal Required', ar: 'يتطلب تجديد' }, products: [ { name: { en: 'Suture Braid Silk 2/0 - 75cm', ar: 'خيط جراحي حريري مجدول 2/0 - 75سم' }, qty: 900, price: 469.9 } ] },
        { id: 'sgh', client: { en: 'Saudi German Hospital Group', ar: 'مجموعة المستشفى السعودي الألماني' }, type: { en: 'Supply Agreement', ar: 'اتفاقية توريد' }, value: 890000, startDate: '2025-09-01', endDate: '2027-08-31', renewals: 0, daysRemaining: 546, status: 'new' as const, stability: { en: 'New Contract', ar: 'عقد جديد' }, products: [ { name: { en: 'Surgical Drain - Jackson-Pratt', ar: 'مصرف جراحي - جاكسون برات' }, qty: 600, price: 312.5 } ] },
    ],
};

const ENT_03_RETENTION = {
    stats: { overallStability: 92.6, totalContractValue: 6480000, activeContracts: 4, recurringRevenue: 4120000, avgContractYears: 2.4 },
    contracts: [
        { id: 'panda-national', client: { en: 'Panda Retail - National Distribution', ar: 'بنده - التوزيع الوطني' }, type: { en: 'Annual Distribution Agreement', ar: 'اتفاقية توزيع سنوية' }, value: 2210000, startDate: '2025-01-01', endDate: '2026-12-31', renewals: 2, daysRemaining: 275, status: 'stable' as const, stability: { en: 'Highly Stable', ar: 'مستقر للغاية' }, products: [ { name: { en: 'BabyJoy Diapers - Jumbo Pack', ar: 'حفاضات بيبي جوي - عبوة كبيرة' }, qty: 2400, price: 182 }, { name: { en: 'BabyJoy Baby Wipes - Value Pack', ar: 'مناديل بيبي جوي - عبوة اقتصادية' }, qty: 1800, price: 64 } ] },
        { id: 'nahdi-modern', client: { en: 'Nahdi Medical', ar: 'النهدي الطبية' }, type: { en: 'Key Account Supply Agreement', ar: 'اتفاقية توريد للحسابات الرئيسية' }, value: 1760000, startDate: '2025-04-01', endDate: '2027-03-31', renewals: 1, daysRemaining: 365, status: 'stable' as const, stability: { en: 'Highly Stable', ar: 'مستقر للغاية' }, products: [ { name: { en: 'Sofy Comfort Night Pads', ar: 'فوط سوفي كومفورت الليلية' }, qty: 2400, price: 38 }, { name: { en: 'Lifree Adult Pants - Medium', ar: 'ليفري سراويل للكبار - متوسط' }, qty: 1100, price: 97 } ] },
        { id: 'danube-renewal', client: { en: 'Danube Markets', ar: 'أسواق الدانوب' }, type: { en: 'Regional Shelf Program', ar: 'برنامج رفوف إقليمي' }, value: 1380000, startDate: '2024-07-01', endDate: '2026-06-30', renewals: 1, daysRemaining: 91, status: 'expiring' as const, stability: { en: 'Renewal Required', ar: 'يتطلب تجديد' }, products: [ { name: { en: 'BabyJoy Baby Wipes - Value Pack', ar: 'مناديل بيبي جوي - عبوة اقتصادية' }, qty: 2200, price: 64 } ] },
        { id: 'al-dawaa-new', client: { en: 'Al-Dawaa Pharmacies', ar: 'صيدليات الدواء' }, type: { en: 'Pharmacy Channel Expansion', ar: 'توسعة قناة الصيدليات' }, value: 1130000, startDate: '2026-01-01', endDate: '2027-12-31', renewals: 0, daysRemaining: 640, status: 'new' as const, stability: { en: 'New Contract', ar: 'عقد جديد' }, products: [ { name: { en: 'Sofy Daily Fresh Liners', ar: 'فوط سوفي اليومية' }, qty: 2800, price: 22 } ] },
    ],
};

const ENT_03_WORKFORCE: WorkforceInput = { totalEmployees: 160, saudiRegular: 46, saudiLowSalary: 6, saudiStudents: 4, saudiSpecialNeeds: 1 };
const DEFAULT_WORKFORCE: WorkforceInput = { totalEmployees: 120, saudiRegular: 42, saudiLowSalary: 4, saudiStudents: 5, saudiSpecialNeeds: 1 };

const DEFAULT_SCENARIO = { revenue: 200000, expenses: 150000, materialFraction: 0.48, workforce: DEFAULT_WORKFORCE, tier: 'platinum' as const };
const ENT_03_SCENARIO = { revenue: 340000, expenses: 268000, materialFraction: 0.54, workforce: ENT_03_WORKFORCE, tier: 'highGreen' as const };

const DEFAULT_EFFICIENCY = {
    velocity: { orderToCash: 142, sectorAverage: 160, improvement: 11.3 },
    orderNumber: 'PO 4100000309',
    stages: [
        { key: 'production', status: 'complete' as const, daysSpent: 18 },
        { key: 'logistics', status: 'complete' as const, daysSpent: 12 },
        { key: 'nupcoAcceptance', status: 'active' as const, daysSpent: 7 },
        { key: 'paymentPending', status: 'pending' as const, daysSpent: 0 },
    ],
    inventory: [
        { product: { en: 'Urological Catheter - Foley 2-Way', ar: 'قسطرة بولية - فولي ثنائية الاتجاه' }, sku: 'UC-F2W-16', stock: 14, maxDays: 90, restockQty: 11.25, restockCost: 7312.5, critical: true },
        { product: { en: 'Suture Braid Silk 2/0 - 75cm', ar: 'خيط جراحي حريري مجدول 2/0 - 75سم' }, sku: 'SBS-20-75', stock: 42, maxDays: 90, restockQty: 0, restockCost: 0, critical: false },
        { product: { en: 'Surgical Drain - Jackson-Pratt', ar: 'مصرف جراحي - جاكسون برات' }, sku: 'SD-JP-400', stock: 28, maxDays: 90, restockQty: 0, restockCost: 0, critical: false },
    ],
};

const ENT_03_EFFICIENCY = {
    velocity: { orderToCash: 54, sectorAverage: 61, improvement: 11.5 },
    orderNumber: 'PO BJ-2026-0412',
    stages: [
        { key: 'production', status: 'complete' as const, daysSpent: 16, label: { en: 'Converting & Packing', ar: 'التحويل والتعبئة' } },
        { key: 'logistics', status: 'complete' as const, daysSpent: 9, label: { en: 'Branch Allocation', ar: 'توزيع الفروع' } },
        { key: 'qaRelease', status: 'active' as const, daysSpent: 4, label: { en: 'QA Release', ar: 'اعتماد الجودة' } },
        { key: 'paymentPending', status: 'pending' as const, daysSpent: 0, label: { en: 'Retail Settlement', ar: 'تسوية التجزئة' } },
    ],
    inventory: [
        { product: { en: 'BabyJoy Diapers - Family Pack', ar: 'حفاضات بيبي جوي - عبوة عائلية' }, sku: 'BJ-FP-42', stock: 16, maxDays: 75, restockQty: 1800, restockCost: 96480, critical: true },
        { product: { en: 'Sofy Comfort Night Pads', ar: 'فوط سوفي كومفورت الليلية' }, sku: 'SF-CN-24', stock: 31, maxDays: 75, restockQty: 0, restockCost: 0, critical: false },
        { product: { en: 'Lifree Adult Pants - Medium', ar: 'ليفري سراويل للكبار - متوسط' }, sku: 'LF-AP-M', stock: 28, maxDays: 75, restockQty: 0, restockCost: 0, critical: false },
    ],
};

const DEFAULT_APPROVALS = [
    { id: 'po-001', poNumber: 'PO-2026-0847', product: 'Suture Braid Silk 2/0 - 75cm', sku: 'SBS-20-75', supplier: 'Medline Saudi Arabia', amount: 939.8, currency: 'SAR', date: '2026-03-01', urgency: 'high' as const, status: 'pending' as const },
    { id: 'po-002', poNumber: 'PO-2026-0848', product: 'Surgical Gloves - Sterile (Box/50)', sku: 'SG-ST-50', supplier: 'Al-Borg Medical Supplies', amount: 1250, currency: 'SAR', date: '2026-03-02', urgency: 'medium' as const, status: 'pending' as const },
    { id: 'po-003', poNumber: 'PO-2026-0849', product: 'IV Cannula 20G - Safety', sku: 'IVC-20G-S', supplier: 'Becton Dickinson KSA', amount: 2180, currency: 'SAR', date: '2026-03-03', urgency: 'low' as const, status: 'pending' as const },
];

const ENT_03_APPROVALS = [
    { id: 'po-301', poNumber: 'PO-2026-3301', product: 'Absorbent Polymer Resin', sku: 'APR-HT-900', supplier: 'Regional Absorbent Materials FZE', amount: 184500, currency: 'SAR', date: '2026-03-26', urgency: 'high' as const, status: 'pending' as const },
    { id: 'po-302', poNumber: 'PO-2026-3302', product: 'Breathable Backsheet Film', sku: 'BBF-420', supplier: 'Najd Packaging Films', amount: 96800, currency: 'SAR', date: '2026-03-27', urgency: 'medium' as const, status: 'pending' as const },
    { id: 'po-303', poNumber: 'PO-2026-3303', product: 'Spunlace Nonwoven Topsheet', sku: 'SNT-150', supplier: 'MENA Nonwoven Supply Co.', amount: 112400, currency: 'SAR', date: '2026-03-28', urgency: 'medium' as const, status: 'pending' as const },
];

const DEFAULT_RECEIVABLES = {
    totalOutstanding: 4369800,
    primaryPO: { number: 'PO 3001145285', client: { en: 'NUPCO Marketplace', ar: 'سوق نوبكو' }, product: { en: 'Suture Braid Silk 2/0 - 75cm', ar: 'خيط جراحي حريري مجدول 2/0 - 75سم' }, amount: 939.8, filingDate: '2026-01-15', paymentTerms: 120 },
    agingBuckets: [
        { label: '0-30', labelAr: '٠-٣٠', amount: 1250000, percent: 28.6 },
        { label: '31-60', labelAr: '٣١-٦٠', amount: 980000, percent: 22.4 },
        { label: '61-90', labelAr: '٦١-٩٠', amount: 1450000, percent: 33.2 },
        { label: '91-120', labelAr: '٩١-١٢٠', amount: 689800, percent: 15.8 },
    ],
    topDebtors: [
        { name: { en: 'NUPCO - Central Region', ar: 'نوبكو - المنطقة الوسطى' }, amount: 1850000, days: 87 },
        { name: { en: 'MOH - Riyadh Cluster', ar: 'وزارة الصحة - تجمع الرياض' }, amount: 1320000, days: 62 },
        { name: { en: 'King Faisal Specialist Hospital', ar: 'مستشفى الملك فيصل التخصصي' }, amount: 750000, days: 45 },
        { name: { en: 'Saudi German Hospital', ar: 'المستشفى السعودي الألماني' }, amount: 449800, days: 28 },
    ],
    collectionRate: 78.4,
    riskScore: 62,
    note: { en: 'NUPCO payment terms are contract-bound at 120 days from filing.', ar: 'شروط دفع نوبكو مرتبطة تعاقدياً بفترة 120 يوماً من تاريخ الرفع.' },
};

const ENT_03_RECEIVABLES = {
    totalOutstanding: 3480000,
    primaryPO: { number: 'INV BJ-2026-188', client: { en: 'Panda Retail - National Distribution', ar: 'بنده - التوزيع الوطني' }, product: { en: 'BabyJoy Diapers - Jumbo Pack', ar: 'حفاضات بيبي جوي - عبوة كبيرة' }, amount: 862400, filingDate: '2026-02-02', paymentTerms: 60 },
    agingBuckets: [
        { label: '0-30', labelAr: '٠-٣٠', amount: 1260000, percent: 36.2 },
        { label: '31-60', labelAr: '٣١-٦٠', amount: 980000, percent: 28.2 },
        { label: '61-90', labelAr: '٦١-٩٠', amount: 760000, percent: 21.8 },
        { label: '91-120', labelAr: '٩١-١٢٠', amount: 480000, percent: 13.8 },
    ],
    topDebtors: [
        { name: { en: 'Panda Retail - National Distribution', ar: 'بنده - التوزيع الوطني' }, amount: 1140000, days: 58 },
        { name: { en: 'Nahdi Medical', ar: 'النهدي الطبية' }, amount: 920000, days: 46 },
        { name: { en: 'Danube Markets', ar: 'أسواق الدانوب' }, amount: 760000, days: 39 },
        { name: { en: 'Al-Dawaa Pharmacies', ar: 'صيدليات الدواء' }, amount: 660000, days: 33 },
    ],
    collectionRate: 84.1,
    riskScore: 68,
    note: { en: 'Modern trade settlements are running on a 60-day cycle, but western region collections need tighter follow-up.', ar: 'تسويات تجارة التجزئة الحديثة تسير على دورة 60 يوماً، لكن تحصيلات المنطقة الغربية تحتاج متابعة أوثق.' },
};

const DEFAULT_EXPORT = {
    score: 87,
    revenueGrowth: 12.4,
    clientRetention: 94.2,
    opEfficiency: 88.7,
    actionLog: [
        { en: 'PO 4600100323 - Approved by CEO on 03/03/2026', ar: 'أمر الشراء 4600100323 - تمت الموافقة من الرئيس التنفيذي بتاريخ 03/03/2026' },
        { en: 'KFSH Renewal Brief - Requested (72 days remaining)', ar: 'ملخص تجديد مستشفى الملك فيصل التخصصي - مطلوب خلال 72 يوماً' },
        { en: 'Catheter Restock PO - Approved (SAR 7,312.50)', ar: 'إعادة توريد القسطرة البولية - تم الاعتماد (ر.س 7,312.50)' },
    ],
};

const ENT_03_EXPORT = {
    score: 86,
    revenueGrowth: 10.8,
    clientRetention: 92.6,
    opEfficiency: 88.4,
    actionLog: [
        { en: 'PO-2026-3301 queued for absorbent polymer release after customs review.', ar: 'تمت جدولة أمر الشراء PO-2026-3301 لاعتماد البوليمر الماص بعد مراجعة الجمارك.' },
        { en: 'Danube renewal brief requested before the June shelf reset window.', ar: 'تم طلب ملخص تجديد الدانوب قبل نافذة إعادة ضبط الرفوف في يونيو.' },
        { en: 'BabyJoy family pack restock approved for west-region branch allocation.', ar: 'تمت الموافقة على إعادة توريد عبوات بيبي جوي العائلية لتخصيص المنطقة الغربية.' },
    ],
};

export function getEntitySupplyChainContent(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_SUPPLY_CHAIN : DEFAULT_SUPPLY_CHAIN;
}

export function getEntitySalesOrder(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_SALES_ORDER : DEFAULT_SALES_ORDER;
}

export function getEntityRetentionReport(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_RETENTION : DEFAULT_RETENTION;
}

export function getEntityEfficiencyContent(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_EFFICIENCY : DEFAULT_EFFICIENCY;
}

export function getEntityApprovals(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_APPROVALS : DEFAULT_APPROVALS;
}

export function getEntityReceivablesContent(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_RECEIVABLES : DEFAULT_RECEIVABLES;
}

export function getEntityReceivablesScore(entityId: string): number {
    return getEntityReceivablesContent(entityId).riskScore;
}

export function getEntityExportSummary(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_EXPORT : DEFAULT_EXPORT;
}

export function getEntityWorkforce(entityId: string): WorkforceInput {
    return entityId === 'ENT_03' ? ENT_03_WORKFORCE : DEFAULT_WORKFORCE;
}

export function getEntityScenarioBaseline(entityId: string) {
    return entityId === 'ENT_03' ? ENT_03_SCENARIO : DEFAULT_SCENARIO;
}
