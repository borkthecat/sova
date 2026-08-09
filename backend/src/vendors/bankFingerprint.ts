import { createHmac } from "crypto";
const FINGERPRINT_SECRET = process.env.FINGERPRINT_SECRET ?? "agentguard-demo-secret-key-2024";
export function normalizeBankAccount(raw: string): string {
    const normalized = raw.normalize("NFKC").trim().replace(/[\s\-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6,34}$/.test(normalized)) {
        throw new Error("Invalid bank account format");
    }
    return normalized;
}
export function fingerprintBankAccount(raw: string): string {
    const normalized = normalizeBankAccount(raw);
    return createHmac("sha256", FINGERPRINT_SECRET)
        .update(normalized)
        .digest("hex");
}
export function extractLast4(raw: string): string {
    const normalized = normalizeBankAccount(raw);
    return normalized.slice(-4);
}
export function maskBankAccount(raw: string): string {
    return `••••${extractLast4(raw)}`;
}
export function maskLast4(last4: string): string {
    return `••••${last4}`;
}
