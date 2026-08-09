import { RiskSignal, AgentAction } from "../agentguard/schemas";
import { VendorInfo, calculateMedian } from "../vendors/vendorService";
import { fingerprintBankAccount } from "../vendors/bankFingerprint";
import { getPrisma } from "../database/client";
export interface BehavioralAnalysisResult {
    signals: RiskSignal[];
    hardPoliciesTriggered: string[];
    isKnownVendor: boolean;
    isKnownBankAccount: boolean;
    historicalMedian: number | null;
}
export async function analyzeBehavior(action: AgentAction, vendor: VendorInfo | null, invoiceId?: string): Promise<BehavioralAnalysisResult> {
    const signals: RiskSignal[] = [];
    const hardPoliciesTriggered: string[] = [];
    let isKnownVendor = false;
    let isKnownBankAccount = false;
    let historicalMedian: number | null = null;
    if (!vendor) {
        signals.push({
            id: "NEW_VENDOR",
            category: "BEHAVIORAL",
            severity: 10,
            title: "Unknown vendor",
            explanation: `No historical record found for vendor "${action.vendorId}". This vendor has not been paid before.`,
        });
        return { signals, hardPoliciesTriggered, isKnownVendor: false, isKnownBankAccount: false, historicalMedian: null };
    }
    isKnownVendor = true;
    const previousAmounts = vendor.paymentHistory.map((p) => p.amount);
    historicalMedian = calculateMedian(previousAmounts);
    if (action.type === "SEND_PAYMENT") {
        const proposedFingerprint = fingerprintBankAccount(action.bankAccount);
        const knownFingerprints = vendor.verifiedAccounts.map((a) => a.fingerprint);
        const historyFingerprints = vendor.paymentHistory.map((p) => p.accountFingerprint);
        const allKnownFingerprints = new Set([...knownFingerprints, ...historyFingerprints]);
        isKnownBankAccount = allKnownFingerprints.has(proposedFingerprint);
        if (!isKnownBankAccount && previousAmounts.length > 0) {
            const verifiedLast4 = vendor.verifiedAccounts[0]?.last4 ?? vendor.paymentHistory[0]?.accountLast4 ?? "????";
            hardPoliciesTriggered.push("KNOWN_VENDOR_NEW_BANK_ACCOUNT");
            signals.push({
                id: "KNOWN_VENDOR_NEW_BANK_ACCOUNT",
                category: "BEHAVIORAL",
                severity: 50,
                title: "New bank account for existing vendor",
                explanation: `${vendor.name} has ${previousAmounts.length} historical payment(s), but none used the proposed bank account. Previously verified account ends in ${verifiedLast4}.`,
                evidence: `Previous verified: ••••${verifiedLast4}`,
            });
        }
        else if (!isKnownBankAccount && previousAmounts.length === 0) {
            signals.push({
                id: "NEW_VENDOR_NEW_ACCOUNT",
                category: "BEHAVIORAL",
                severity: 10,
                title: "New vendor, unverified bank account",
                explanation: `No previous payments exist for ${vendor.name}. The bank account cannot be verified against historical records.`,
            });
        }
        if (historicalMedian !== null && previousAmounts.length > 0) {
            const ratio = action.amount / historicalMedian;
            if (ratio > 3) {
                signals.push({
                    id: "UNUSUAL_PAYMENT_AMOUNT_HIGH",
                    category: "BEHAVIORAL",
                    severity: 50,
                    title: "Unusually large payment",
                    explanation: `The proposed payment of ${action.currency} ${action.amount.toLocaleString()} is ${ratio.toFixed(1)}x the historical median of ${action.currency} ${historicalMedian.toLocaleString()} for ${vendor.name}.`,
                    evidence: `Proposed: ${action.amount}, Median: ${historicalMedian}, Ratio: ${ratio.toFixed(1)}x`,
                });
            }
            else if (ratio > 2) {
                signals.push({
                    id: "UNUSUAL_PAYMENT_AMOUNT_MODERATE",
                    category: "BEHAVIORAL",
                    severity: 20,
                    title: "Above-average payment amount",
                    explanation: `The proposed payment of ${action.currency} ${action.amount.toLocaleString()} is ${ratio.toFixed(1)}x the historical median of ${action.currency} ${historicalMedian.toLocaleString()} for ${vendor.name}.`,
                    evidence: `Proposed: ${action.amount}, Median: ${historicalMedian}, Ratio: ${ratio.toFixed(1)}x`,
                });
            }
        }
        if (invoiceId) {
            try {
                const prisma = getPrisma();
                const approvalRecord = await prisma.invoiceApprovalRecord.findFirst({
                    where: { invoiceId, vendorId: vendor.id },
                });
                if (!approvalRecord) {
                    signals.push({
                        id: "MISSING_APPROVAL_TRAIL",
                        category: "BEHAVIORAL",
                        severity: 25,
                        title: "Missing invoice approval record",
                        explanation: `Invoice ${invoiceId} has no prior approval record in the system. A payment without an approved invoice requires additional review.`,
                    });
                }
            }
            catch {
            }
        }
    }
    if (action.type === "UPDATE_PAYEE_BANK_DETAILS") {
        const proposedFingerprint = fingerprintBankAccount(action.proposedBankAccount);
        const knownFingerprints = new Set([
            ...vendor.verifiedAccounts.map((a) => a.fingerprint),
            ...vendor.paymentHistory.map((p) => p.accountFingerprint),
        ]);
        if (!knownFingerprints.has(proposedFingerprint)) {
            hardPoliciesTriggered.push("KNOWN_VENDOR_NEW_BANK_ACCOUNT");
            const verifiedLast4 = vendor.verifiedAccounts[0]?.last4 ?? vendor.paymentHistory[0]?.accountLast4 ?? "????";
            signals.push({
                id: "KNOWN_VENDOR_NEW_BANK_ACCOUNT",
                category: "BEHAVIORAL",
                severity: 50,
                title: "Bank detail change to unverified account",
                explanation: `Attempting to change ${vendor.name}'s verified bank account (••••${verifiedLast4}) to a previously unseen account. This requires independent human verification.`,
                evidence: `Current verified: ••••${verifiedLast4}`,
            });
        }
    }
    return { signals, hardPoliciesTriggered, isKnownVendor, isKnownBankAccount, historicalMedian };
}
