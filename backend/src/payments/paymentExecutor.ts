import { v4 as uuidv4 } from "uuid";
import { AgentAction } from "../agentguard/schemas";
import { getPrisma } from "../database/client";
import { fingerprintBankAccount, extractLast4 } from "../vendors/bankFingerprint";
import { getVendorById } from "../vendors/vendorService";
class PaymentExecutor {
    async execute(actionId: string, idempotencyKey: string, action: AgentAction): Promise<{
        transactionId: string;
        status: string;
        executedAt: string;
    }> {
        const prisma = getPrisma();
        const existing = await prisma.execution.findUnique({
            where: { idempotencyKey },
        });
        if (existing) {
            return {
                transactionId: existing.transactionId ?? "existing",
                status: existing.status,
                executedAt: existing.executedAt.toISOString(),
            };
        }
        const transactionId = `txn_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
        const executedAt = new Date();
        const result = {
            transactionId,
            status: "EXECUTED",
            executedAt: executedAt.toISOString(),
            action: {
                type: action.type,
                vendorId: action.vendorId,
                vendorName: action.vendorName,
            },
        };
        await prisma.execution.create({
            data: {
                id: uuidv4(),
                actionId,
                idempotencyKey,
                transactionId,
                status: "EXECUTED",
                result: JSON.stringify(result),
                executedAt,
            },
        });
        if (action.type === "SEND_PAYMENT") {
            const fingerprint = fingerprintBankAccount(action.bankAccount);
            const last4 = extractLast4(action.bankAccount);
            await prisma.paymentHistory.create({
                data: {
                    id: uuidv4(),
                    vendorId: action.vendorId,
                    amount: action.amount,
                    currency: action.currency,
                    accountLast4: last4,
                    accountFingerprint: fingerprint,
                    executedAt,
                    transactionId,
                },
            });
        }
        return {
            transactionId,
            status: "EXECUTED",
            executedAt: executedAt.toISOString(),
        };
    }
}
export const paymentExecutor = new PaymentExecutor();
