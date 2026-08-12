import { createHash } from "crypto";
import { PaymentProposal, AgentAction, EvaluationResult, RiskSignal, PaymentProposalSchema, } from "./schemas";
import { analyzeContent } from "../detection/contentDetector";
import { analyzeBehavior } from "../detection/behavioralDetector";
import { computeRisk } from "./riskEngine";
import { getVendorById } from "../vendors/vendorService";
import { fingerprintBankAccount, extractLast4 } from "../vendors/bankFingerprint";
import { generateCounterfactual } from "./counterfactual";
import { resolveVendorIdentity, VendorResolutionResult } from "../vendors/vendorResolution";
export function computeActionHash(action: AgentAction, sourceId?: string): string {
    const canonical: Record<string, unknown> = {
        type: action.type,
        vendorId: action.vendorId,
        vendorName: action.vendorName,
    };
    if (action.type === "SEND_PAYMENT") {
        canonical.amount = action.amount;
        canonical.currency = action.currency;
        canonical.bankAccountFingerprint = fingerprintBankAccount(action.bankAccount);
        canonical.invoiceId = action.invoiceId ?? null;
    }
    if (action.type === "UPDATE_PAYEE_BANK_DETAILS") {
        canonical.proposedBankAccountFingerprint = fingerprintBankAccount(action.proposedBankAccount);
        canonical.previousBankAccountFingerprint = action.previousBankAccount
            ? fingerprintBankAccount(action.previousBankAccount)
            : null;
    }
    canonical.sourceId = sourceId ?? null;
    return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
export async function evaluateProposal(proposal: PaymentProposal): Promise<EvaluationResult> {
    const parsed = PaymentProposalSchema.safeParse(proposal);
    if (!parsed.success) {
        return failSafe("INVALID_PROPOSAL", "The payment proposal failed schema validation.");
    }
    const { action, source } = parsed.data;
    try {
        const contentAnalysis = analyzeContent(source);
        let vendorResolution: VendorResolutionResult;
        try {
            vendorResolution = await resolveVendorIdentity({
                claimedVendorId: action.vendorId,
                claimedVendorName: action.vendorName,
                senderEmail: source.sender,
            });
        }
        catch {
            return failSafe("VENDOR_RESOLUTION_FAILED", "The trusted vendor identity could not be resolved.");
        }
        const canonicalAction = vendorResolution.status === "MATCHED"
            ? { ...action, vendorId: vendorResolution.vendorId!, vendorName: vendorResolution.vendorName! }
            : action;
        let vendor = null;
        try {
            vendor = vendorResolution.status === "MATCHED" ? await getVendorById(canonicalAction.vendorId) : null;
        }
        catch (err) {
            return failSafe("VENDOR_LOOKUP_FAILED", "The vendor database could not be queried.");
        }
        const invoiceId = canonicalAction.type === "SEND_PAYMENT" ? canonicalAction.invoiceId : undefined;
        let behavioralAnalysis;
        try {
            behavioralAnalysis = await analyzeBehavior(canonicalAction, vendor, invoiceId);
        }
        catch (err) {
            return failSafe("BEHAVIORAL_ANALYSIS_FAILED", "The behavioral analysis engine failed.");
        }
        const identitySignals: RiskSignal[] = vendorResolution.status === "MATCHED" ? [] : [{
                id: vendorResolution.status === "AMBIGUOUS" ? "VENDOR_IDENTITY_AMBIGUOUS" : "VENDOR_IDENTITY_UNKNOWN",
                category: "SYSTEM",
                severity: vendorResolution.status === "AMBIGUOUS" ? 100 : 20,
                title: vendorResolution.status === "AMBIGUOUS" ? "Vendor identity is ambiguous" : "Vendor identity is unverified",
                explanation: vendorResolution.confidenceReasons.join(" "),
            }];
        const identityPolicies = vendorResolution.status === "MATCHED"
            ? []
            : [vendorResolution.status === "AMBIGUOUS" ? "VENDOR_IDENTITY_AMBIGUOUS" : "VENDOR_IDENTITY_UNKNOWN"];
        const riskResult = computeRisk(contentAnalysis.signals, behavioralAnalysis.signals, identitySignals, [...behavioralAnalysis.hardPoliciesTriggered, ...identityPolicies]);
        const actionHash = computeActionHash(canonicalAction, source.sourceId);
        let proposedLast4 = "";
        let verifiedLast4: string | undefined;
        if (canonicalAction.type === "SEND_PAYMENT") {
            proposedLast4 = extractLast4(canonicalAction.bankAccount);
            verifiedLast4 = vendor?.verifiedAccounts[0]?.last4 ?? vendor?.paymentHistory[0]?.accountLast4;
        }
        else {
            proposedLast4 = extractLast4(canonicalAction.proposedBankAccount);
            verifiedLast4 = vendor?.verifiedAccounts[0]?.last4 ?? vendor?.paymentHistory[0]?.accountLast4;
        }
        const counterfactual = generateCounterfactual(canonicalAction, riskResult.hardPoliciesTriggered, contentAnalysis.signals.map((s) => s.id), vendor?.name ?? canonicalAction.vendorName, proposedLast4, verifiedLast4);
        return {
            decision: riskResult.decision,
            riskScore: riskResult.riskScore,
            contentSignals: contentAnalysis.signals,
            behavioralSignals: behavioralAnalysis.signals,
            systemSignals: identitySignals,
            hardPoliciesTriggered: riskResult.hardPoliciesTriggered,
            counterfactual,
            actionHash,
            canonicalAction,
            trustedVendorId: vendorResolution.status === "MATCHED" ? vendorResolution.vendorId : undefined,
        };
    }
    catch (err) {
        return failSafe("SECURITY_EVALUATION_FAILED", "The transaction could not be safely evaluated and was moved to manual review.");
    }
}
function failSafe(id: string, explanation: string): EvaluationResult {
    const systemSignal: RiskSignal = {
        id,
        category: "SYSTEM",
        severity: 100,
        title: "Security evaluation unavailable",
        explanation,
    };
    return {
        decision: "REQUIRE_APPROVAL",
        riskScore: 100,
        contentSignals: [],
        behavioralSignals: [],
        systemSignals: [systemSignal],
        hardPoliciesTriggered: ["SECURITY_EVALUATION_FAILED"],
        counterfactual: "Without review, this action would have executed without proper security evaluation.",
        actionHash: "",
    };
}
