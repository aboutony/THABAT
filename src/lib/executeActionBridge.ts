/**
 * executeActionBridge — Phase 15: ActionBridge
 *
 * Mock API dispatcher for 3 executive action types.
 * Simulates a 600ms round-trip; designed to be replaced with live
 * integrations (SendGrid / WhatsApp Business / Linear) in a future phase.
 */

export type ActionType =
    | 'EMAIL_OUTREACH'
    | 'WHATSAPP_SIGNAL'
    | 'INTERNAL_TICKET';

export interface ActionPayload {
    type:      ActionType;
    /** Recipient / team / entity the action targets */
    target:    string;
    subject?:  string;
    body?:     string;
    priority?: 'high' | 'normal';
}

export interface ActionResult {
    success:    boolean;
    type:       ActionType;
    /** Short confirmation shown in the ActionToast */
    messageEn:  string;
    messageAr:  string;
    /** Mock ticket / dispatch reference */
    reference:  string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function mockRef(): string {
    return `ACT-${Date.now().toString(36).toUpperCase()}`;
}

function mockDelay(ms = 620): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeActionBridge(
    payload: ActionPayload,
): Promise<ActionResult> {
    await mockDelay();

    const ref = mockRef();

    switch (payload.type) {
        case 'EMAIL_OUTREACH':
            return {
                success:   true,
                type:      'EMAIL_OUTREACH',
                messageEn: `Email summary drafted for ${payload.target}.`,
                messageAr: `تم صياغة ملخص البريد الإلكتروني لـ ${payload.target}.`,
                reference: ref,
            };

        case 'WHATSAPP_SIGNAL':
            return {
                success:   true,
                type:      'WHATSAPP_SIGNAL',
                messageEn: `High-priority WhatsApp signal sent to ${payload.target}.`,
                messageAr: `تم إرسال إشارة واتساب عالية الأولوية إلى ${payload.target}.`,
                reference: ref,
            };

        case 'INTERNAL_TICKET':
            return {
                success:   true,
                type:      'INTERNAL_TICKET',
                messageEn: `Friction ticket ${ref} logged for ${payload.target}.`,
                messageAr: `تم تسجيل تذكرة احتكاك ${ref} لـ ${payload.target}.`,
                reference: ref,
            };
    }
}
