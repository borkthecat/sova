import { Router } from "express";
import { PaymentProposalSchema } from "../agentguard/schemas";
import { agentGuard } from "../agentguard/AgentGuard";
const router = Router();
router.post("/proposals", async (req, res): Promise<void> => {
    const parsed = PaymentProposalSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Invalid proposal",
            details: parsed.error.issues,
        });
        return;
    }
    try {
        const result = await agentGuard.submitProposal(parsed.data);
        res.json({
            actionId: result?.id,
            status: result?.status,
            decision: result?.decision,
            riskScore: result?.riskScore,
        });
    }
    catch (err: any) {
        console.error("[PROPOSAL]", err);
        res.status(500).json({ error: err.message });
    }
});
export { router as proposalRoutes };
