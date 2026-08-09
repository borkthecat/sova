import { Router } from "express";
import { getPrisma } from "../database/client";
import { auditService } from "../audit/auditService";
const router = Router();
router.get("/", async (req, res) => {
    try {
        const prisma = getPrisma();
        const [total, executed, pendingApproval, rejected, failed] = await Promise.all([
            prisma.action.count(),
            prisma.action.count({ where: { status: "EXECUTED" } }),
            prisma.action.count({ where: { status: "PENDING_APPROVAL" } }),
            prisma.action.count({ where: { status: "REJECTED" } }),
            prisma.action.count({ where: { status: "FAILED" } }),
        ]);
        const auditVerify = await auditService.verifyChain();
        res.json({
            company: "Northstar Studio Pte Ltd",
            agent: "Accounts Payable Agent",
            paymentsInspected: total,
            automaticallyExecuted: executed,
            heldForReview: pendingApproval,
            rejected,
            failed,
            auditIntegrity: auditVerify.valid ? "VERIFIED" : "COMPROMISED",
            auditEntries: auditVerify.entries,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});
export { router as statsRoutes };
