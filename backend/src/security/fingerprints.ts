import { createHmac } from "crypto";
import { AgentAction, SourceContext } from "../agentguard/schemas";
import { fingerprintBankAccount } from "../vendors/bankFingerprint";
const secret = process.env.FINGERPRINT_SECRET ?? "sova-local-demo-secret-change-in-production";
const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
const normalize = (value?: string) => (value ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
export function paymentFingerprint(action: AgentAction, canonicalVendorId: string): string | undefined {
    if (action.type !== "SEND_PAYMENT" || !action.invoiceId)
        return undefined;
    // A changed destination account is not a duplicate payment. It is a distinct,
    // high-risk proposal that must be evaluated instead of inheriting an old decision.
    return hmac([canonicalVendorId, normalize(action.invoiceId), action.currency, action.amount.toFixed(2), fingerprintBankAccount(action.bankAccount)].join("|"));
}
export function sourceFingerprint(source: SourceContext): string {
    return hmac([normalize(source.sender), normalize(source.subject), normalize(source.normalizedText)].join("|"));
}
