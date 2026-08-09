import { createHmac } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getPrisma } from "../database/client";
interface AppendEntryArgs {
    actionId: string;
    eventType: string;
    payload: unknown;
}
const auditSecret = process.env.AUDIT_SIGNING_SECRET ?? "sova-local-audit-secret-change-in-production";
const sign = (input: string) => createHmac("sha256", auditSecret).update(input).digest("hex");
class AuditService {
    async appendEntry({ actionId, eventType, payload }: AppendEntryArgs): Promise<void> {
        const prisma = getPrisma();
        const lastEntry = await prisma.auditEntry.findFirst({
            orderBy: { createdAt: "desc" },
        });
        const previousHash = lastEntry?.eventHash ?? "GENESIS";
        const entryId = uuidv4();
        const timestampMs = Date.now();
        const payloadJson = JSON.stringify(payload);
        const hashInput = previousHash + JSON.stringify({
            id: entryId,
            actionId,
            eventType,
            payloadJson,
            timestampMs,
        });
        const eventHash = sign(hashInput);
        const storedPayload = { ...JSON.parse(payloadJson), __hashMeta: { timestampMs } };
        try {
            await prisma.auditEntry.create({
                data: {
                    id: entryId,
                    actionId,
                    eventType,
                    payload: JSON.stringify(storedPayload),
                    previousHash,
                    eventHash,
                },
            });
        }
        catch (err) {
            console.error("[AUDIT] Failed to write audit entry:", err);
            throw new Error("Audit write failure: cannot proceed safely without audit record.");
        }
    }
    async verifyChain(): Promise<{
        valid: boolean;
        entries: number;
        firstBrokenAt?: string;
    }> {
        const prisma = getPrisma();
        const entries = await prisma.auditEntry.findMany({
            orderBy: { createdAt: "asc" },
        });
        if (entries.length === 0) {
            return { valid: true, entries: 0 };
        }
        let previousHash = "GENESIS";
        for (const entry of entries) {
            const storedPayload = JSON.parse(entry.payload);
            const timestampMs = storedPayload.__hashMeta?.timestampMs;
            const { __hashMeta, ...originalPayload } = storedPayload;
            const payloadJson = JSON.stringify(originalPayload);
            const hashInput = previousHash + JSON.stringify({
                id: entry.id,
                actionId: entry.actionId,
                eventType: entry.eventType,
                payloadJson,
                timestampMs,
            });
            const expectedHash = sign(hashInput);
            if (expectedHash !== entry.eventHash) {
                return { valid: false, entries: entries.length, firstBrokenAt: entry.id };
            }
            previousHash = entry.eventHash;
        }
        return { valid: true, entries: entries.length };
    }
    async getEntries(filters?: {
        actionId?: string;
        from?: Date;
        to?: Date;
        limit?: number;
        offset?: number;
    }) {
        const prisma = getPrisma();
        return prisma.auditEntry.findMany({
            where: {
                ...(filters?.actionId ? { actionId: filters.actionId } : {}),
                ...(filters?.from || filters?.to
                    ? {
                        createdAt: {
                            ...(filters?.from ? { gte: filters.from } : {}),
                            ...(filters?.to ? { lte: filters.to } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
            take: filters?.limit ?? 200,
            skip: filters?.offset ?? 0,
            include: { action: true },
        });
    }
}
export const auditService = new AuditService();
