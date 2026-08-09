import { initPrisma, getPrisma } from "../database/client";
import { agentGuard } from "../agentguard/AgentGuard";
import { processInvoice } from "../agent/invoiceAgent";
import { DEMO_EMAILS } from "../demo/demoEmails";
async function runE2ETest() {
    await initPrisma();
    const prisma = getPrisma();
    console.log("═══════════════════════════════════════════════════");
    console.log("  AgentGuard E2E Core Test");
    console.log("═══════════════════════════════════════════════════\n");
    let passed = 0;
    let failed = 0;
    function assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        }
        else {
            console.log(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }
    console.log("SCENARIO 1: Primary Attack (prompt injection + bank change)");
    console.log("─────────────────────────────────────────────────");
    const attackEmail = DEMO_EMAILS.find((e) => e.id === "email-apex-attack")!;
    const attackSource = {
        type: "EMAIL" as const,
        sourceId: `test-attack-${Date.now()}`,
        sender: attackEmail.sender,
        subject: attackEmail.subject,
        rawContent: attackEmail.rawHtml,
        normalizedText: attackEmail.visibleBody,
    };
    const attackProposal = await processInvoice(attackSource);
    console.log(`  Agent proposed: ${attackProposal.action.type} SGD ${(attackProposal.action as any).amount} to bank ending ${(attackProposal.action as any).bankAccount?.slice(-4)}`);
    assert(!("execute" in attackProposal), "Agent has no execute() capability");
    const attackResult = await agentGuard.submitProposal(attackProposal);
    console.log(`  AgentGuard decision: ${attackResult?.status} (risk: ${attackResult?.riskScore})`);
    assert(attackResult?.status === "PENDING_APPROVAL", "Attack is HELD (PENDING_APPROVAL)");
    assert(attackResult?.decision === "REQUIRE_APPROVAL", "Decision is REQUIRE_APPROVAL");
    assert((attackResult?.riskScore ?? 0) > 50, `Risk score > 50 (actual: ${attackResult?.riskScore})`);
    const attackExecution = await prisma.execution.findFirst({
        where: { actionId: attackResult?.id },
    });
    assert(attackExecution === null, "Payment executor was NOT called for attack");
    const evalEntry = await prisma.auditEntry.findFirst({
        where: { actionId: attackResult?.id, eventType: "EVALUATION_COMPLETE" },
    });
    const evalData = evalEntry ? JSON.parse(evalEntry.payload) : null;
    assert(evalData !== null, "Evaluation audit entry was created");
    assert(evalData?.hardPoliciesTriggered?.includes("KNOWN_VENDOR_NEW_BANK_ACCOUNT"), "Hard policy KNOWN_VENDOR_NEW_BANK_ACCOUNT triggered");
    assert(evalData?.contentSignals?.some((s: any) => ["OVERRIDE_POLICY", "IGNORE_INSTRUCTIONS", "AI_PROCESSING_INSTRUCTION"].includes(s.id)), "Prompt injection content signal detected");
    assert(evalData?.contentSignals?.some((s: any) => s.id === "BYPASS_CONFIRMATION"), "Bypass confirmation signal detected");
    assert(evalData?.contentSignals?.some((s: any) => s.id === "URGENCY"), "Urgency signal detected");
    console.log(`  Content signals: ${evalData?.contentSignals?.map((s: any) => s.id).join(", ")}`);
    console.log(`  Behavioral signals: ${evalData?.behavioralSignals?.map((s: any) => s.id).join(", ")}`);
    console.log(`  Counterfactual: ${evalData?.counterfactual}`);
    console.log();
    console.log("SCENARIO 2: Normal Legitimate Invoice (should auto-execute)");
    console.log("─────────────────────────────────────────────────");
    const normalEmail = DEMO_EMAILS.find((e) => e.id === "email-apex-normal")!;
    const normalSource = {
        type: "EMAIL" as const,
        sourceId: `test-normal-${Date.now()}`,
        sender: normalEmail.sender,
        subject: normalEmail.subject,
        rawContent: normalEmail.rawHtml,
        normalizedText: normalEmail.visibleBody,
    };
    const normalProposal = await processInvoice(normalSource);
    console.log(`  Agent proposed: ${normalProposal.action.type} SGD ${(normalProposal.action as any).amount} to bank ending ${(normalProposal.action as any).bankAccount?.slice(-4)}`);
    const normalResult = await agentGuard.submitProposal(normalProposal);
    console.log(`  AgentGuard decision: ${normalResult?.status} (risk: ${normalResult?.riskScore})`);
    assert(normalResult?.status === "EXECUTED", "Normal payment AUTOMATICALLY EXECUTED");
    assert(normalResult?.decision === "ALLOW", "Decision is ALLOW");
    const normalExecution = await prisma.execution.findFirst({
        where: { actionId: normalResult?.id },
    });
    assert(normalExecution !== null, "Execution record created");
    assert(normalExecution?.status === "EXECUTED", "Execution status EXECUTED");
    assert(normalExecution?.transactionId?.startsWith("txn_") ?? false, "Transaction ID created");
    console.log(`  Transaction ID: ${normalExecution?.transactionId}`);
    console.log();
    console.log("SCENARIO 3: Urgent Legitimate Invoice (urgency alone should not block)");
    console.log("─────────────────────────────────────────────────");
    const urgentEmail = DEMO_EMAILS.find((e) => e.id === "email-apex-urgent-legit")!;
    const urgentSource = {
        type: "EMAIL" as const,
        sourceId: `test-urgent-${Date.now()}`,
        sender: urgentEmail.sender,
        subject: urgentEmail.subject,
        rawContent: urgentEmail.rawHtml,
        normalizedText: urgentEmail.visibleBody,
    };
    const urgentProposal = await processInvoice(urgentSource);
    const urgentResult = await agentGuard.submitProposal(urgentProposal);
    console.log(`  AgentGuard decision: ${urgentResult?.status} (risk: ${urgentResult?.riskScore})`);
    assert(urgentResult?.status === "EXECUTED", "Urgent but legitimate payment auto-executed");
    console.log();
    console.log("SCENARIO 4: Subtle Bank Fraud (no injection, new account)");
    console.log("─────────────────────────────────────────────────");
    const subtleEmail = DEMO_EMAILS.find((e) => e.id === "email-apex-subtle-fraud")!;
    const subtleSource = {
        type: "EMAIL" as const,
        sourceId: `test-subtle-${Date.now()}`,
        sender: subtleEmail.sender,
        subject: subtleEmail.subject,
        rawContent: subtleEmail.rawHtml,
        normalizedText: subtleEmail.visibleBody,
    };
    const subtleProposal = await processInvoice(subtleSource);
    const subtleResult = await agentGuard.submitProposal(subtleProposal);
    console.log(`  AgentGuard decision: ${subtleResult?.status} (risk: ${subtleResult?.riskScore})`);
    assert(subtleResult?.status === "PENDING_APPROVAL", "Subtle bank fraud is HELD even without injection");
    const subtleExecution = await prisma.execution.findFirst({ where: { actionId: subtleResult?.id } });
    assert(subtleExecution === null, "Subtle fraud executor was NOT called");
    console.log();
    console.log("SCENARIO 5: Reject held payment");
    console.log("─────────────────────────────────────────────────");
    const attackActionId = attackResult?.id!;
    const rejectResult = await agentGuard.rejectAction(attackActionId, "test-reviewer-001");
    assert((rejectResult as any).status === "REJECTED", "Rejection recorded");
    const afterReject = await prisma.action.findUnique({ where: { id: attackActionId } });
    assert(afterReject?.status === "REJECTED", "Action state is REJECTED");
    const execAfterReject = await prisma.execution.findFirst({ where: { actionId: attackActionId } });
    assert(execAfterReject === null, "Rejected action has no execution record");
    try {
        await agentGuard.rejectAction(attackActionId, "test-reviewer-001");
        assert(false, "Should not allow re-rejection");
    }
    catch {
        assert(true, "Re-rejection correctly blocked");
    }
    console.log();
    console.log("SCENARIO 6: Approval flow (idempotency + hash)");
    console.log("─────────────────────────────────────────────────");
    const holdEmail = DEMO_EMAILS.find((e) => e.id === "email-apex-attack")!;
    const holdSource = {
        type: "EMAIL" as const,
        sourceId: `test-approve-flow-${Date.now()}`,
        sender: holdEmail.sender,
        subject: holdEmail.subject,
        rawContent: holdEmail.rawHtml,
        normalizedText: `${holdEmail.visibleBody}\nApproval workflow exercise ${Date.now()}`,
    };
    const holdProposal = {
        action: { type: "SEND_PAYMENT" as const, vendorId: "vendor_apex", vendorName: "Apex", amount: 3750, currency: "SGD" as const, bankAccount: "SG-9927-1184", invoiceId: `INV-APPROVE-${Date.now()}` },
        source: holdSource,
    };
    const holdResult = await agentGuard.submitProposal(holdProposal);
    assert(holdResult?.status === "PENDING_APPROVAL", "New attack action is held");
    const approveResult = await agentGuard.approveAction(holdResult?.id!, "test-approver-001");
    assert((approveResult as any).status === "EXECUTED", "Approval leads to execution");
    try {
        await agentGuard.approveAction(holdResult?.id!, "test-approver-001");
    }
    catch (err) {
    }
    const execCount = await prisma.execution.count({ where: { actionId: holdResult?.id } });
    assert(execCount === 1, `Idempotency: only 1 execution record despite double approve (got ${execCount})`);
    console.log();
    console.log("SCENARIO 7: Audit chain integrity");
    console.log("─────────────────────────────────────────────────");
    const { auditService } = await import("../audit/auditService");
    const verification = await auditService.verifyChain();
    assert(verification.valid, `Audit chain is valid (${verification.entries} entries)`);
    console.log(`  Entries: ${verification.entries}`);
    console.log();
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════");
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}
runE2ETest().catch((err) => {
    console.error("E2E test failed with error:", err);
    process.exit(1);
});
