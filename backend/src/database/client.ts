import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import path from "path";
import fs from "fs";

let prisma: PrismaClient | null = null;

export function initPrisma(): PrismaClient {
    if (!prisma) {
        if (!process.env.DATABASE_URL) {
            if (process.env.VERCEL === "1") {
                throw new Error("DATABASE_URL must be configured for the deployed API.");
            }

            const dbDir = path.join(__dirname, "../../data");
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            process.env.DATABASE_URL = `file:${path.join(dbDir, "agentguard.db")}`;
        }

        const clientOptions: Prisma.PrismaClientOptions = {
            log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
        };

        if (process.env.DATABASE_URL.startsWith("postgres")) {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            prisma = new PrismaClient({
                ...clientOptions,
                adapter: new PrismaNeon(pool),
            });
        } else {
            prisma = new PrismaClient(clientOptions);
        }
    }
    return prisma;
}
export function getPrisma(): PrismaClient {
    if (!prisma)
        return initPrisma();
    return prisma;
}
