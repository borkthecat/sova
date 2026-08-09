import { Router } from "express";
import { getPrisma } from "../database/client";
import { requireApprover } from "../auth/authMiddleware";
import { agentGuard } from "../agentguard/AgentGuard";
import { maskLast4 } from "../vendors/bankFingerprint";
const router = Router();
router.get("/", async (req, res) => {
    try {
        const prisma = getPrisma();
        const actions = await prisma.action.findMany({
            where: { status: { in: ["PENDING_APPROVAL", "APPROVED", "REJECTED"] } },
            include: {
                approval: true,
                execution: true,
                vendor: true,
                auditEntries: {
                    where: { eventType: "EVALUATION_COMPLETE" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
        });
        const result = actions.map((a) => {
            const evalEntry = a.auditEntries[0];
            const evalData = evalEntry ? JSON.parse(evalEntry.payload) : null;
            const payload = JSON.parse(a.payload);
            return {
                id: a.id,
                type: a.type,
                status: a.status,
                vendorId: a.vendorId,
                vendorName: a.vendor?.name ?? payload.vendorName,
                amount: payload.amount,
                currency: payload.currency,
                bankAccountLast4: payload.bankAccount
                    ? maskLast4(payload.bankAccount.slice(-4))
                    : payload.proposedBankAccount
                        ? maskLast4(payload.proposedBankAccount.slice(-4))
                        : null,
                invoiceId: payload.invoiceId,
                riskScore: a.riskScore,
                decision: a.decision,
                contentSignals: evalData?.contentSignals ?? [],
                behavioralSignals: evalData?.behavioralSignals ?? [],
                systemSignals: evalData?.systemSignals ?? [],
                hardPoliciesTriggered: evalData?.hardPoliciesTriggered ?? [],
                counterfactual: evalData?.counterfactual ?? "",
                approval: a.approval
                    ? {
                        reviewerId: a.approval.reviewerId,
                        decision: a.approval.decision,
                        decidedAt: a.approval.decidedAt,
                    }
                    : null,
                execution: a.execution
                    ? {
                        transactionId: a.execution.transactionId,
                        status: a.execution.status,
                        executedAt: a.execution.executedAt,
                    }
                    : null,
                sourceContext: JSON.parse(a.sourceContext),
                createdAt: a.createdAt,
            };
        });
        res.json(result);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch approvals" });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const prisma = getPrisma();
        const action = await prisma.action.findUnique({
            where: { id: req.params.id },
            include: {
                approval: true,
                execution: true,
                vendor: true,
                auditEntries: { orderBy: { createdAt: "asc" } },
            },
        });
        if (!action) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        const evalEntry = action.auditEntries.find((e) => e.eventType === "EVALUATION_COMPLETE");
        const evalData = evalEntry ? JSON.parse(evalEntry.payload) : null;
        const payload = JSON.parse(action.payload);
        res.json({
            id: action.id,
            type: action.type,
            status: action.status,
            payload,
            riskScore: action.riskScore,
            decision: action.decision,
            contentSignals: evalData?.contentSignals ?? [],
            behavioralSignals: evalData?.behavioralSignals ?? [],
            systemSignals: evalData?.systemSignals ?? [],
            hardPoliciesTriggered: evalData?.hardPoliciesTriggered ?? [],
            counterfactual: evalData?.counterfactual ?? "",
            sourceContext: JSON.parse(action.sourceContext),
            approval: action.approval,
            execution: action.execution,
            auditEntries: action.auditEntries.map((e) => ({
                id: e.id,
                eventType: e.eventType,
                createdAt: e.createdAt,
            })),
            createdAt: action.createdAt,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch approval" });
    }
});
router.post("/:id/approve", requireApprover, async (req, res): Promise<void> => {
    try {
        const reviewerId = req.user!.id;
        const result = await agentGuard.approveAction(req.params.id, reviewerId);
        res.json({ success: true, result });
    }
    catch (err: any) {
        console.error("[APPROVE]", err);
        res.status(400).json({ error: err.message });
    }
});
router.post("/:id/reject", requireApprover, async (req, res): Promise<void> => {
    try {
        const reviewerId = req.user!.id;
        const result = await agentGuard.rejectAction(req.params.id, reviewerId);
        res.json({ success: true, result });
    }
    catch (err: any) {
        console.error("[REJECT]", err);
        res.status(400).json({ error: err.message });
    }
});
export { router as approvalRoutes };
