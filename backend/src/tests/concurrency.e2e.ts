import { agentGuard } from "../agentguard/AgentGuard";
import { getPrisma, initPrisma } from "../database/client";
const proposal = (sourceId: string, invoiceId: string) => ({
    action: { type: "SEND_PAYMENT" as const, vendorId: "vendor_apex", vendorName: "Apex Office Supplies", amount: 3750, currency: "SGD" as const, bankAccount: "SG-9927-1184", invoiceId },
    source: { type: "EMAIL" as const, sourceId, sender: "billing@apex.example", subject: "Payment update", normalizedText: `Invoice ${invoiceId}; new bank account SG-9927-1184.`, rawContent: "" },
});
async function assert(condition: unknown, message: string) { if (!condition)
    throw new Error(message); }
async function run() {
    await initPrisma();
    const prisma = getPrisma();
    const action = await agentGuard.submitProposal(proposal("concurrency-approve", "INV-CONCURRENT-1"));
    await assert(action?.status === "PENDING_APPROVAL", "fixture must be held");
    await Promise.allSettled(Array.from({ length: 20 }, () => agentGuard.approveAction(action!.id, "concurrency-approver")));
    await assert(await prisma.execution.count({ where: { actionId: action!.id } }) === 1, "20 concurrent approvals must create one execution");
    await assert((await prisma.action.findUnique({ where: { id: action!.id } }))?.status === "EXECUTED", "action must finish executed once");
    const race = await agentGuard.submitProposal(proposal("concurrency-race", "INV-CONCURRENT-2"));
    await Promise.allSettled([
        ...Array.from({ length: 10 }, () => agentGuard.approveAction(race!.id, "race-approver")),
        ...Array.from({ length: 10 }, () => agentGuard.rejectAction(race!.id, "race-reviewer")),
    ]);
    const final = await prisma.action.findUnique({ where: { id: race!.id } });
    await assert(["EXECUTED", "REJECTED"].includes(final?.status ?? ""), "race must end in a valid terminal state");
    await assert(!(final?.status === "REJECTED" && await prisma.execution.count({ where: { actionId: race!.id } }) > 0), "rejected action must never execute");
    console.log("Concurrency checks passed: 20 approvals execute once; approve/reject race ends safely.");
    await prisma.$disconnect();
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
