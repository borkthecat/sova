import { v4 as uuidv4 } from "uuid";
import { PaymentProposal, ActionStatus, isValidTransition, AgentActionSchema, SourceContextSchema, } from "./schemas";
import { evaluateProposal, computeActionHash } from "./interceptor";
import { getPrisma } from "../database/client";
import { auditService } from "../audit/auditService";
import { paymentExecutor } from "../payments/paymentExecutor";
import { extractLast4 } from "../vendors/bankFingerprint";
import { paymentFingerprint, sourceFingerprint } from "../security/fingerprints";
import { addVerifiedBankAccount } from "../vendors/vendorService";
import { normalizeContent } from "../detection/normalization";
export class AgentGuard {
    private auditSafeAction(action: PaymentProposal["action"]) {
        if (action.type === "SEND_PAYMENT")
            return { ...action, bankAccount: `••••${extractLast4(action.bankAccount)}` };
        return { ...action, proposedBankAccount: `••••${extractLast4(action.proposedBankAccount)}`, previousBankAccount: action.previousBankAccount ? `••••${extractLast4(action.previousBankAccount)}` : undefined };
    }
    async submitProposal(proposal: PaymentProposal) {
        const prisma = getPrisma();
        const actionParsed = AgentActionSchema.safeParse(proposal.action);
        const sourceParsed = SourceContextSchema.safeParse(proposal.source);
        if (!actionParsed.success || !sourceParsed.success) {
            const actionId = uuidv4();
            await auditService.appendEntry({
                actionId,
                eventType: "PROPOSAL_REJECTED_INVALID",
                payload: {
                    errors: [
                        ...(actionParsed.success ? [] : actionParsed.error.issues),
                        ...(sourceParsed.success ? [] : sourceParsed.error.issues),
                    ],
                },
            });
            throw new Error("Invalid payment proposal: schema validation failed");
        }
        const action = actionParsed.data;
        const source = sourceParsed.data;
        const normalizedSource = normalizeContent(source.rawContent || source.normalizedText);
        const sourceRecord = { ...source, visibleText: normalizedSource.visibleText, hiddenText: normalizedSource.hiddenText };
        const idempotencyKey = `proposal-${source.sourceId}-${action.type}-${action.vendorId}`;
        const existing = await prisma.action.findUnique({
            where: { idempotencyKey },
            include: { approval: true, execution: true },
        });
        if (existing) {
            return existing;
        }
        const evaluation = await evaluateProposal({ action, source });
        const canonicalAction = evaluation.canonicalAction ?? action;
        const currentPaymentFingerprint = paymentFingerprint(canonicalAction, canonicalAction.vendorId);
        const currentSourceFingerprint = sourceFingerprint(source);
        const replay = await prisma.action.findFirst({
            where: { OR: [
                    ...(currentPaymentFingerprint ? [{ paymentFingerprint: currentPaymentFingerprint }] : []),
                    { sourceFingerprint: currentSourceFingerprint },
                ] },
            orderBy: { createdAt: "desc" },
            include: { approval: true, execution: true },
        });
        if (replay) {
            await auditService.appendEntry({ actionId: replay.id, eventType: "DUPLICATE_OR_REPLAY_BLOCKED", payload: { replayedSource: replay.sourceFingerprint === currentSourceFingerprint, duplicatePayment: replay.paymentFingerprint === currentPaymentFingerprint } });
            return { ...replay, duplicate: true };
        }
        const actionId = uuidv4();
        const actionRecord = await prisma.action.create({
            data: {
                id: actionId,
                vendorId: canonicalAction.vendorId,
                type: canonicalAction.type,
                status: "PROPOSED",
                payload: JSON.stringify(canonicalAction),
                sourceContext: JSON.stringify(sourceRecord),
                idempotencyKey,
                paymentFingerprint: currentPaymentFingerprint,
                sourceFingerprint: currentSourceFingerprint,
            },
        });
        await auditService.appendEntry({
            actionId,
            eventType: "PROPOSAL_RECEIVED",
            payload: { action: this.auditSafeAction(canonicalAction), source: { ...source, rawContent: undefined } },
        });
        await this.transitionState(actionId, "PROPOSED", "EVALUATING");
        await prisma.action.update({
            where: { id: actionId },
            data: {
                actionHash: evaluation.actionHash,
                riskScore: evaluation.riskScore,
                decision: evaluation.decision,
            },
        });
        await auditService.appendEntry({
            actionId,
            eventType: "EVALUATION_COMPLETE",
            payload: {
                decision: evaluation.decision,
                riskScore: evaluation.riskScore,
                contentSignals: evaluation.contentSignals,
                behavioralSignals: evaluation.behavioralSignals,
                systemSignals: evaluation.systemSignals,
                hardPoliciesTriggered: evaluation.hardPoliciesTriggered,
                counterfactual: evaluation.counterfactual,
            },
        });
        if (evaluation.decision === "ALLOW") {
            await this.transitionState(actionId, "EVALUATING", "ALLOWED");
            await this.transitionState(actionId, "ALLOWED", "EXECUTING");
            let execResult;
            try {
                execResult = await paymentExecutor.execute(actionId, idempotencyKey, canonicalAction);
                await this.transitionState(actionId, "EXECUTING", "EXECUTED");
                await auditService.appendEntry({
                    actionId,
                    eventType: "PAYMENT_EXECUTED",
                    payload: { executionResult: execResult, finalOutcome: "EXECUTED" },
                });
            }
            catch (err) {
                await this.transitionState(actionId, "EXECUTING", "FAILED");
                await auditService.appendEntry({
                    actionId,
                    eventType: "PAYMENT_EXECUTION_FAILED",
                    payload: { error: String(err), finalOutcome: "FAILED" },
                });
            }
        }
        else {
            await this.transitionState(actionId, "EVALUATING", "PENDING_APPROVAL");
            await prisma.approval.create({ data: { id: uuidv4(), actionId } });
            await auditService.appendEntry({
                actionId,
                eventType: "HELD_FOR_REVIEW",
                payload: { reason: evaluation.hardPoliciesTriggered, counterfactual: evaluation.counterfactual },
            });
        }
        return prisma.action.findUnique({
            where: { id: actionId },
            include: { approval: true, execution: true },
        });
    }
    async approveAction(actionId: string, reviewerId: string) {
        const prisma = getPrisma();
        const actionRecord = await prisma.action.findUnique({
            where: { id: actionId },
            include: { approval: true },
        });
        if (!actionRecord)
            throw new Error("Action not found");
        if (actionRecord.status !== "PENDING_APPROVAL") {
            throw new Error(`Cannot approve action in state ${actionRecord.status}`);
        }
        const storedPayload = JSON.parse(actionRecord.payload);
        const source = JSON.parse(actionRecord.sourceContext);
        const currentHash = computeActionHash(storedPayload, source.sourceId);
        if (actionRecord.actionHash && currentHash !== actionRecord.actionHash) {
            await auditService.appendEntry({
                actionId,
                eventType: "HASH_MISMATCH_BLOCKED",
                payload: { stored: actionRecord.actionHash, current: currentHash },
            });
            throw new Error("Action integrity check failed: the action was modified after evaluation.");
        }
        await prisma.approval.update({
            where: { actionId },
            data: {
                reviewerId,
                decision: "APPROVED",
                actionHash: currentHash,
                decidedAt: new Date(),
            },
        });
        await this.transitionState(actionId, "PENDING_APPROVAL", "APPROVED");
        await auditService.appendEntry({
            actionId,
            eventType: "HUMAN_APPROVED",
            payload: { reviewerId, actionHash: currentHash },
        });
        await this.transitionState(actionId, "APPROVED", "EXECUTING");
        const idempotencyKey = actionRecord.idempotencyKey;
        const action = JSON.parse(actionRecord.payload);
        let execResult;
        try {
            if (action.type === "UPDATE_PAYEE_BANK_DETAILS") {
                await addVerifiedBankAccount(action.vendorId, action.proposedBankAccount, { verifiedBy: reviewerId, approvalActionId: actionId, verificationSource: "HUMAN_APPROVAL" });
                await auditService.appendEntry({ actionId, eventType: "VENDOR_BANK_ACCOUNT_VERIFIED", payload: { vendorId: action.vendorId, accountLast4: extractLast4(action.proposedBankAccount), reviewerId } });
            }
            execResult = await paymentExecutor.execute(actionId, idempotencyKey, action);
            await this.transitionState(actionId, "EXECUTING", "EXECUTED");
            await auditService.appendEntry({
                actionId,
                eventType: "PAYMENT_EXECUTED",
                payload: { executionResult: execResult, finalOutcome: "EXECUTED", reviewerId },
            });
            return execResult;
        }
        catch (err) {
            await this.transitionState(actionId, "EXECUTING", "FAILED");
            await auditService.appendEntry({
                actionId,
                eventType: "PAYMENT_EXECUTION_FAILED",
                payload: { error: String(err), finalOutcome: "FAILED", reviewerId },
            });
            throw err;
        }
    }
    async rejectAction(actionId: string, reviewerId: string) {
        const prisma = getPrisma();
        const actionRecord = await prisma.action.findUnique({ where: { id: actionId } });
        if (!actionRecord)
            throw new Error("Action not found");
        if (actionRecord.status !== "PENDING_APPROVAL") {
            throw new Error(`Cannot reject action in state ${actionRecord.status}`);
        }
        await prisma.approval.update({
            where: { actionId },
            data: {
                reviewerId,
                decision: "REJECTED",
                decidedAt: new Date(),
            },
        });
        await this.transitionState(actionId, "PENDING_APPROVAL", "REJECTED");
        await auditService.appendEntry({
            actionId,
            eventType: "HUMAN_REJECTED",
            payload: { reviewerId, finalOutcome: "REJECTED" },
        });
        return { status: "REJECTED" };
    }
    private async transitionState(actionId: string, from: ActionStatus, to: ActionStatus) {
        if (!isValidTransition(from, to)) {
            throw new Error(`Invalid state transition: ${from} → ${to}`);
        }
        const prisma = getPrisma();
        const updated = await prisma.action.updateMany({ where: { id: actionId, status: from }, data: { status: to } });
        if (updated.count !== 1) {
            throw new Error("Action state changed concurrently; refresh and review the latest status.");
        }
    }
}
export const agentGuard = new AgentGuard();
