import { Router } from "express";
import { DEMO_ATTACHMENTS, DEMO_EMAILS } from "../demo/demoEmails";
import { processInvoice } from "../agent/invoiceAgent";
import { agentGuard } from "../agentguard/AgentGuard";
const router = Router();
router.get("/emails", (req, res) => {
    res.json(DEMO_EMAILS.map((e) => ({
        id: e.id,
        subject: e.subject,
        sender: e.sender,
        label: e.label,
        scenario: e.scenario,
        messageBody: `Hi Accounts Payable,\n\nPlease find attached ${DEMO_ATTACHMENTS[e.id]?.fileName ?? "the supplier document"} for processing.\n\nRegards,\n${e.sender.split("@")[0]}`,
        attachment: DEMO_ATTACHMENTS[e.id],
    })));
});
router.get("/emails/:id", (req, res) => {
    const email = DEMO_EMAILS.find((e) => e.id === req.params.id);
    if (!email) {
        res.status(404).json({ error: "Email not found" });
        return;
    }
    res.json(email);
});
router.post("/emails/:id/process", async (req, res) => {
    const email = DEMO_EMAILS.find((e) => e.id === req.params.id);
    if (!email) {
        res.status(404).json({ error: "Email not found" });
        return;
    }
    try {
        const source = {
            type: "EMAIL" as const,
            sourceId: email.id,
            sender: email.sender,
            replyTo: email.replyTo,
            subject: email.subject,
            rawContent: email.rawHtml,
            normalizedText: [email.visibleBody, DEMO_ATTACHMENTS[email.id]?.extractedText ?? ""].join("\n"),
        };
        const proposal = await processInvoice(source);
        const result = await agentGuard.submitProposal(proposal);
        res.json({
            success: true,
            emailId: email.id,
            action: proposal.action,
            agentGuardResult: {
                actionId: result?.id,
                status: result?.status,
                decision: result?.decision,
                riskScore: result?.riskScore,
                duplicate: (result as any)?.duplicate === true,
            },
        });
    }
    catch (err: any) {
        console.error("[DEMO PROCESS]", err);
        res.status(500).json({ error: err.message });
    }
});
export { router as demoRoutes };
