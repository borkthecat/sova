import { v4 as uuidv4 } from "uuid";
import { getPrisma, initPrisma } from "../database/client";
import { fingerprintBankAccount, extractLast4 } from "../vendors/bankFingerprint";
async function seed() {
    await initPrisma();
    const prisma = getPrisma();
    console.log("Seeding Sova demo data...");
    await prisma.auditEntry.deleteMany();
    await prisma.execution.deleteMany();
    await prisma.approval.deleteMany();
    await prisma.action.deleteMany();
    await prisma.invoiceApprovalRecord.deleteMany();
    await prisma.paymentHistory.deleteMany();
    await prisma.vendorBankAccount.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
        data: {
            id: uuidv4(),
            name: "Demo Finance Approver",
            email: "approver@northstar.example",
            role: "APPROVER",
            token: "demo-approver-token",
        },
    });
    await prisma.user.create({
        data: { id: uuidv4(), name: "Demo Security Admin", email: "admin@sova.example", role: "ADMIN", token: "demo-admin-token" },
    });
    await prisma.user.create({
        data: {
            id: uuidv4(),
            name: "Demo Viewer",
            email: "viewer@northstar.example",
            role: "VIEWER",
            token: "demo-viewer-token",
        },
    });
    console.log("Created users");
    const apexId = "vendor_apex";
    const apexBank = "SG-8821-4410";
    const apexFingerprint = fingerprintBankAccount(apexBank);
    const apexLast4 = extractLast4(apexBank);
    await prisma.vendor.create({
        data: {
            id: apexId,
            name: "Apex Office Supplies",
            email: "billing@apex.example",
            domain: "apex.example",
        },
    });
    await prisma.vendorBankAccount.create({
        data: {
            id: uuidv4(),
            vendorId: apexId,
            fingerprint: apexFingerprint,
            last4: apexLast4,
            isActive: true,
        },
    });
    const apexPayments = [3200, 3450, 3700, 3300, 3600];
    for (const amount of apexPayments) {
        await prisma.paymentHistory.create({
            data: {
                id: uuidv4(),
                vendorId: apexId,
                amount,
                currency: "SGD",
                accountLast4: apexLast4,
                accountFingerprint: apexFingerprint,
                transactionId: `txn_legacy_apex_${amount}`,
            },
        });
    }
    await prisma.invoiceApprovalRecord.create({
        data: {
            id: uuidv4(),
            invoiceId: "INV-2040",
            vendorId: apexId,
            status: "INVOICE_APPROVED",
        },
    });
    await prisma.invoiceApprovalRecord.create({
        data: {
            id: uuidv4(),
            invoiceId: "INV-2041",
            vendorId: apexId,
            status: "INVOICE_APPROVED",
        },
    });
    console.log("Created Apex Office Supplies with 5 historical payments");
    const brightlineId = "vendor_brightline";
    const brightlineBank = "SG-3312-0084";
    const brightlineFingerprint = fingerprintBankAccount(brightlineBank);
    const brightlineLast4 = extractLast4(brightlineBank);
    await prisma.vendor.create({
        data: {
            id: brightlineId,
            name: "Brightline Logistics",
            email: "accounts@brightline.example",
            domain: "brightline.example",
        },
    });
    await prisma.vendorBankAccount.create({
        data: {
            id: uuidv4(),
            vendorId: brightlineId,
            fingerprint: brightlineFingerprint,
            last4: brightlineLast4,
            isActive: true,
        },
    });
    const brightlinePayments = [2200, 2450, 2300];
    for (const amount of brightlinePayments) {
        await prisma.paymentHistory.create({
            data: {
                id: uuidv4(),
                vendorId: brightlineId,
                amount,
                currency: "SGD",
                accountLast4: brightlineLast4,
                accountFingerprint: brightlineFingerprint,
                transactionId: `txn_legacy_brightline_${amount}`,
            },
        });
    }
    await prisma.invoiceApprovalRecord.create({
        data: {
            id: uuidv4(),
            invoiceId: "INV-BL-0091",
            vendorId: brightlineId,
            status: "INVOICE_APPROVED",
        },
    });
    console.log("Created Brightline Logistics with 3 historical payments");
    const techsparkId = "vendor_techspark";
    await prisma.vendor.create({
        data: {
            id: techsparkId,
            name: "TechSpark Solutions",
            email: "billing@techspark.example",
            domain: "techspark.example",
        },
    });
    console.log("Created TechSpark Solutions (new vendor, no history)");
    console.log("\nSeed complete. Demo credentials:");
    console.log("  Approver token: demo-approver-token");
    console.log("  Viewer token:   demo-viewer-token");
    console.log("\nReady to run: npm run dev");
}
seed()
    .catch(console.error)
    .finally(async () => {
    const { getPrisma } = await import("../database/client");
    await getPrisma().$disconnect();
});
