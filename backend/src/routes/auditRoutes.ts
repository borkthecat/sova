import { Router } from "express";
import { auditService } from "../audit/auditService";
import { getPrisma } from "../database/client";
const router = Router();
export function csvCell(value: unknown): string {
    const text = String(value ?? "");
    const formulaSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${formulaSafe.replace(/"/g, '""')}"`;
}
router.get("/", async (req, res) => {
    try {
        const { from, to, limit, offset } = req.query;
        const entries = await auditService.getEntries({
            from: from ? new Date(from as string) : undefined,
            to: to ? new Date(to as string) : undefined,
            limit: limit ? parseInt(limit as string) : 100,
            offset: offset ? parseInt(offset as string) : 0,
        });
        res.json(entries.map((e) => ({
            id: e.id,
            actionId: e.actionId,
            eventType: e.eventType,
            payload: JSON.parse(e.payload),
            eventHash: e.eventHash.slice(0, 16) + "...",
            createdAt: e.createdAt,
            action: e.action
                ? {
                    type: e.action.type,
                    status: e.action.status,
                    vendorId: e.action.vendorId,
                    riskScore: e.action.riskScore,
                    decision: e.action.decision,
                }
                : null,
        })));
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch audit log" });
    }
});
router.get("/verify", async (req, res) => {
    try {
        const result = await auditService.verifyChain();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: "Audit verification failed" });
    }
});
router.get("/export.csv", async (req, res) => {
    try {
        const prisma = getPrisma();
        const actions = await prisma.action.findMany({
            include: {
                vendor: true,
                approval: true,
                execution: true,
                auditEntries: {
                    where: { eventType: "EVALUATION_COMPLETE" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
        });
        const rows = [
            [
                "ActionId",
                "CreatedAt",
                "Type",
                "Status",
                "Vendor",
                "Amount",
                "Currency",
                "AccountMasked",
                "RiskScore",
                "Decision",
                "HardPolicies",
                "HumanDecision",
                "FinalOutcome",
                "ReviewerId",
                "TransactionId",
            ].join(","),
        ];
        for (const action of actions) {
            const payload = JSON.parse(action.payload);
            const evalEntry = action.auditEntries[0];
            const evalData = evalEntry ? JSON.parse(evalEntry.payload) : null;
            const accountRaw = payload.bankAccount ?? payload.proposedBankAccount ?? "";
            const accountMasked = accountRaw ? `••••${accountRaw.slice(-4)}` : "";
            rows.push([
                action.id, action.createdAt.toISOString(), action.type, action.status,
                action.vendor?.name ?? payload.vendorName ?? "", payload.amount ?? "", payload.currency ?? "", accountMasked,
                action.riskScore, action.decision ?? "", (evalData?.hardPoliciesTriggered ?? []).join("; "),
                action.approval?.decision ?? "", action.execution ? "EXECUTED" : action.status === "REJECTED" ? "REJECTED" : "PENDING",
                action.approval?.reviewerId ?? "", action.execution?.transactionId ?? "",
            ].map(csvCell).join(","));
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="sova-audit-${Date.now()}.csv"`);
        res.send(rows.join("\n"));
    }
    catch (err) {
        res.status(500).json({ error: "Export failed" });
    }
});
export { router as auditRoutes };
