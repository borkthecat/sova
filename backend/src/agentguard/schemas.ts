import { z } from "zod";
export const SourceContextSchema = z.object({
    type: z.enum(["EMAIL", "INVOICE", "DOCUMENT"]),
    sourceId: z.string(),
    sender: z.string().optional(),
    replyTo: z.string().optional(),
    subject: z.string().optional(),
    rawContent: z.string().optional(),
    normalizedText: z.string(),
});
export type SourceContext = z.infer<typeof SourceContextSchema>;
export const SendPaymentSchema = z.object({
    type: z.literal("SEND_PAYMENT"),
    vendorId: z.string().min(1),
    vendorName: z.string().min(1),
    amount: z.number().positive(),
    currency: z.literal("SGD"),
    bankAccount: z.string().min(1),
    invoiceId: z.string().optional(),
});
export const UpdatePayeeBankDetailsSchema = z.object({
    type: z.literal("UPDATE_PAYEE_BANK_DETAILS"),
    vendorId: z.string().min(1),
    vendorName: z.string().min(1),
    previousBankAccount: z.string().optional(),
    proposedBankAccount: z.string().min(1),
});
export const AgentActionSchema = z.discriminatedUnion("type", [
    SendPaymentSchema,
    UpdatePayeeBankDetailsSchema,
]);
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type SendPayment = z.infer<typeof SendPaymentSchema>;
export type UpdatePayeeBankDetails = z.infer<typeof UpdatePayeeBankDetailsSchema>;
export const PaymentProposalSchema = z.object({
    action: AgentActionSchema,
    source: SourceContextSchema,
});
export type PaymentProposal = z.infer<typeof PaymentProposalSchema>;
export interface RiskSignal {
    id: string;
    category: "CONTENT" | "BEHAVIORAL" | "SYSTEM";
    severity: number;
    title: string;
    explanation: string;
    evidence?: string;
}
export interface EvaluationResult {
    decision: "ALLOW" | "REQUIRE_APPROVAL";
    riskScore: number;
    contentSignals: RiskSignal[];
    behavioralSignals: RiskSignal[];
    systemSignals: RiskSignal[];
    hardPoliciesTriggered: string[];
    counterfactual: string;
    actionHash: string;
    canonicalAction?: AgentAction;
    // Only a vendor matched to trusted metadata may be stored as an Action relation.
    trustedVendorId?: string;
}
export type ActionStatus = "PROPOSED" | "EVALUATING" | "ALLOWED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
export const VALID_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
    PROPOSED: ["EVALUATING"],
    EVALUATING: ["ALLOWED", "PENDING_APPROVAL", "FAILED"],
    ALLOWED: ["EXECUTING"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED"],
    APPROVED: ["EXECUTING"],
    REJECTED: [],
    EXECUTING: ["EXECUTED", "FAILED"],
    EXECUTED: [],
    FAILED: [],
};
export function isValidTransition(from: ActionStatus, to: ActionStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
