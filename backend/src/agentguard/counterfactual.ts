import { AgentAction } from "./schemas";
export function generateCounterfactual(action: AgentAction, hardPoliciesTriggered: string[], contentSignalIds: string[], vendorName: string, proposedLast4: string, verifiedLast4?: string): string {
    const hasInjection = contentSignalIds.some((id) => ["OVERRIDE_POLICY", "IGNORE_INSTRUCTIONS", "TREAT_AS_VERIFIED", "BYPASS_CONFIRMATION", "SKIP_VERIFICATION", "AI_PROCESSING_INSTRUCTION"].includes(id));
    const hasBankChange = hardPoliciesTriggered.includes("KNOWN_VENDOR_NEW_BANK_ACCOUNT");
    if (action.type === "SEND_PAYMENT") {
        const amount = `${action.currency} ${action.amount.toLocaleString()}`;
        const accountDisplay = `••••${proposedLast4}`;
        if (hasInjection && hasBankChange) {
            return `Without review, ${amount} would have been sent to ${accountDisplay} — a bank account never previously used for ${vendorName} — after the source instructed the AI agent to bypass payment verification policies.`;
        }
        if (hasBankChange && verifiedLast4) {
            return `Without review, ${amount} would have been sent to ${accountDisplay}, a bank account never previously used for ${vendorName}. The only verified account on file ends in ${verifiedLast4}.`;
        }
        if (hasBankChange) {
            return `Without review, ${amount} would have been sent to ${accountDisplay}, a bank account never previously used for ${vendorName}.`;
        }
        if (hasInjection) {
            return `Without review, ${amount} would have been processed after the source attempted to override payment verification procedures.`;
        }
        return `Without review, ${amount} would have been automatically processed and executed.`;
    }
    if (action.type === "UPDATE_PAYEE_BANK_DETAILS") {
        const newAccountDisplay = `••••${proposedLast4}`;
        if (verifiedLast4) {
            return `Without review, this would have replaced ${vendorName}'s verified bank account (••••${verifiedLast4}) with ${newAccountDisplay}, a previously unseen account.`;
        }
        return `Without review, this would have changed ${vendorName}'s bank account details to a previously unverified account (${newAccountDisplay}).`;
    }
    return "Without review, this action would have been automatically executed.";
}
