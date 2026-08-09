import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
let prisma: PrismaClient | null = null;
export function initPrisma(): PrismaClient {
    if (!prisma) {
        if (!process.env.DATABASE_URL) {
            const dbDir = path.join(__dirname, "../../data");
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            process.env.DATABASE_URL = `file:${path.join(dbDir, "agentguard.db")}`;
        }
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
        });
    }
    return prisma;
}
export function getPrisma(): PrismaClient {
    if (!prisma)
        return initPrisma();
    return prisma;
}
