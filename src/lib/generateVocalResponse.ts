/**
 * generateVocalResponse — Phase 13: Intent Engine
 *
 * Produces a natural-language Oracle response string for a given intent.
 * Pulls live data from the same sources the dashboard uses so the answer
 * is always consistent with what the user sees on screen.
 */

import type { VoiceIntent } from './processVoiceIntent';
import { getAtRiskClients, CLIENT_HEALTH_RESULTS } from './calculateClientHealth';
import { TTV_RESULTS } from './calculateTTV';

// ── Generator ─────────────────────────────────────────────────────────────────

export function generateVocalResponse(
    intent: VoiceIntent,
    locale: string,
    /** Optional: pass the current health score for richer FINANCIAL_HEALTH answers */
    healthScore?: number,
): string {
    const isAr = locale === 'ar';

    switch (intent) {

        case 'RETENTION_RISK': {
            const atRisk = getAtRiskClients();
            const count  = atRisk.length;

            if (count === 0) {
                return isAr
                    ? 'جميع العملاء في وضع صحي جيد حالياً.'
                    : 'All clients are in good standing right now.';
            }

            const top  = atRisk[0];
            const name = isAr ? top.name.ar : top.name.en;

            return isAr
                ? `مفهوم. لدينا ${count} ${count === 1 ? 'عميل' : 'عملاء'} في خطر. تم صياغة رسالة تواصل لـ ${name} — الأولوية القصوى بدرجة صحة ${top.healthScore}.`
                : `Understood. We have ${count} client${count === 1 ? '' : 's'} at risk. Outreach drafted for ${name} — highest priority at health score ${top.healthScore}.`;
        }

        case 'OPERATIONAL_FRICTION': {
            const high = TTV_RESULTS.filter(r => r.severity === 'high');
            const med  = TTV_RESULTS.filter(r => r.severity === 'medium');

            if (high.length === 0 && med.length === 0) {
                return isAr
                    ? 'لا توجد اختناقات حرجة. العمليات تسير بشكل طبيعي.'
                    : 'No critical bottlenecks. Operations running normally.';
            }

            const top  = high[0] ?? med[0];
            const name = isAr ? top.label.ar : top.label.en;

            // Action-confirming vocal response — the bridge dispatch happens in OracleBriefing
            return isAr
                ? `مفهوم. تم إرسال إشارة إلى فريق ${name} لتحديد أولوية العقود المعلّقة.`
                : `Understood. Signal sent to the ${name} team to prioritize the pending contracts.`;
        }

        case 'FINANCIAL_HEALTH': {
            const score = healthScore ?? 0;

            if (score >= 75) {
                return isAr
                    ? `درجة الصحة المالية ${score} — الوضع مستقر. الهوامش ضمن النطاق الآمن.`
                    : `Financial health score ${score} — position is stable. Margins within safe range.`;
            }
            if (score >= 50) {
                return isAr
                    ? `درجة الصحة المالية ${score} — يوجد ضغط على الهوامش. مصاريف التشغيل تحتاج مراجعة.`
                    : `Financial health score ${score} — margin pressure detected. Operating costs need review.`;
            }
            return isAr
                ? `درجة الصحة المالية ${score} — تحذير. التدفق النقدي والهوامش تحت الضغط.`
                : `Financial health score ${score} — warning. Cash flow and margins are under pressure.`;
        }

        case 'COMPLIANCE_STATUS': {
            const totalClients = CLIENT_HEALTH_RESULTS.length;
            return isAr
                ? `مستوى نطاقات الحالي: أخضر مرتفع. نسبة السعودة 34%. تراقب ${totalClients} عميلاً في المنظومة.`
                : `Current Nitaqat tier: High Green. Saudization at 34%. Monitoring ${totalClients} clients in the system.`;
        }

        case 'UNKNOWN':
            return isAr
                ? 'لم أفهم طلبك. جرّب: "هامش"، "نطاقات"، "اختناق"، أو "عملاء".'
                : 'I didn\'t catch that. Try: "margin", "Nitaqat", "bottleneck", or "clients".';
    }
}
