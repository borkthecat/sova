import { getPrisma } from "../database/client";
import { fingerprintBankAccount, extractLast4 } from "./bankFingerprint";
export interface VendorInfo {
    id: string;
    name: string;
    email?: string | null;
    domain?: string | null;
    verifiedAccounts: Array<{
        fingerprint: string;
        last4: string;
        verifiedAt: Date;
        isActive: boolean;
    }>;
    paymentHistory: Array<{
        amount: number;
        currency: string;
        accountLast4: string;
        accountFingerprint: string;
        executedAt: Date;
    }>;
}
export async function getVendorById(vendorId: string): Promise<VendorInfo | null> {
    const prisma = getPrisma();
    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
            bankAccounts: { where: { isActive: true }, orderBy: { verifiedAt: "desc" } },
            payments: { orderBy: { executedAt: "desc" } },
        },
    });
    if (!vendor)
        return null;
    return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        domain: vendor.domain,
        verifiedAccounts: vendor.bankAccounts.map((a) => ({
            fingerprint: a.fingerprint,
            last4: a.last4,
            verifiedAt: a.verifiedAt,
            isActive: a.isActive,
        })),
        paymentHistory: vendor.payments.map((p) => ({
            amount: p.amount,
            currency: p.currency,
            accountLast4: p.accountLast4,
            accountFingerprint: p.accountFingerprint,
            executedAt: p.executedAt,
        })),
    };
}
export async function isBankAccountKnown(vendorId: string, bankAccountRaw: string): Promise<boolean> {
    const fingerprint = fingerprintBankAccount(bankAccountRaw);
    const prisma = getPrisma();
    const account = await prisma.vendorBankAccount.findFirst({
        where: { vendorId, fingerprint },
    });
    return account !== null;
}
export async function addVerifiedBankAccount(vendorId: string, bankAccountRaw: string, verification: {
    verifiedBy: string;
    approvalActionId: string;
    verificationSource: string;
}): Promise<void> {
    const fingerprint = fingerprintBankAccount(bankAccountRaw);
    const last4 = extractLast4(bankAccountRaw);
    const prisma = getPrisma();
    await prisma.vendorBankAccount.upsert({
        where: { fingerprint },
        create: { vendorId, fingerprint, last4, ...verification },
        update: { isActive: true, ...verification },
    });
}
export async function getAllVendors() {
    const prisma = getPrisma();
    return prisma.vendor.findMany({
        include: {
            bankAccounts: { where: { isActive: true } },
            payments: true,
        },
    });
}
export function calculateMedian(amounts: number[]): number | null {
    if (amounts.length === 0)
        return null;
    const sorted = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}
