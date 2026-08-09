import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { processInvoice } from "../agent/invoiceAgent";
import { agentGuard } from "../agentguard/AgentGuard";
const router = Router();
interface AttackLabRequest {
    vendorId?: string;
    vendorName?: string;
    sender: string;
    replyTo?: string;
    subject?: string;
    amount: number;
    currency?: string;
    bankAccount: string;
    invoiceBody: string;
    hiddenInstruction?: string;
    actionType?: "SEND_PAYMENT" | "UPDATE_PAYEE_BANK_DETAILS";
    previousBankAccount?: string;
    invoiceId?: string;
    approvalTrailStatus?: "INVOICE_APPROVED" | "NONE";
    useProvidedAction?: boolean;
}
router.post("/run", async (req, res) => {
    const body = req.body as AttackLabRequest;
    if (!body.sender || !body.invoiceBody) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    const amount = parseFloat(String(body.amount));
    if (body.useProvidedAction && body.actionType !== "UPDATE_PAYEE_BANK_DETAILS" && (isNaN(amount) || amount <= 0)) {
        res.status(400).json({ error: "Invalid amount" });
        return;
    }
    const sourceId = `attack-lab-${uuidv4()}`;
    const hiddenBlock = body.hiddenInstruction
        ? `<!-- ${body.hiddenInstruction} -->\n<div style="display:none;font-size:0;color:white">${body.hiddenInstruction}</div>`
        : "";
    const rawHtml = `<html><body>
<pre>${body.invoiceBody}</pre>
${hiddenBlock}
</body></html>`;
    const source = {
        type: "EMAIL" as const,
        sourceId,
        sender: body.sender,
        replyTo: body.replyTo,
        subject: body.subject ?? `Attack Lab: ${body.vendorName} SGD ${amount}`,
        rawContent: rawHtml,
        normalizedText: [body.invoiceBody, body.hiddenInstruction ?? ""].filter(Boolean).join("\n"),
    };
    let action: any;
    if (!body.useProvidedAction) {
        action = (await processInvoice(source)).action;
    }
    else if (body.actionType === "UPDATE_PAYEE_BANK_DETAILS") {
        action = {
            type: "UPDATE_PAYEE_BANK_DETAILS",
            vendorId: body.vendorId,
            vendorName: body.vendorName,
            previousBankAccount: body.previousBankAccount,
            proposedBankAccount: body.bankAccount,
        };
    }
    else {
        action = {
            type: "SEND_PAYMENT",
            vendorId: body.vendorId,
            vendorName: body.vendorName,
            amount,
            currency: (body.currency ?? "SGD") as "SGD",
            bankAccount: body.bankAccount,
            invoiceId: body.invoiceId,
        };
    }
    try {
        const result = await agentGuard.submitProposal({ action, source });
        const { getPrisma } = await import("../database/client");
        const prisma = getPrisma();
        const evalEntry = await prisma.auditEntry.findFirst({
            where: { actionId: result?.id, eventType: "EVALUATION_COMPLETE" },
        });
        const evalData = evalEntry ? JSON.parse(evalEntry.payload) : null;
        res.json({
            success: true,
            actionId: result?.id,
            extractedAction: action,
            status: result?.status,
            decision: result?.decision,
            riskScore: result?.riskScore,
            contentSignals: evalData?.contentSignals ?? [],
            behavioralSignals: evalData?.behavioralSignals ?? [],
            systemSignals: evalData?.systemSignals ?? [],
            hardPoliciesTriggered: evalData?.hardPoliciesTriggered ?? [],
            counterfactual: evalData?.counterfactual ?? "",
        });
    }
    catch (err: any) {
        console.error("[ATTACK LAB]", err);
        res.status(500).json({ error: err.message });
    }
});
export { router as attackLabRoutes };
