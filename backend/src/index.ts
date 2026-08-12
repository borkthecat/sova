import express from "express";
import cors from "cors";
import path from "path";
import { initPrisma } from "./database/client";
import { demoRoutes } from "./routes/demoRoutes";
import { proposalRoutes } from "./routes/proposalRoutes";
import { approvalRoutes } from "./approvals/approvalRoutes";
import { vendorRoutes } from "./routes/vendorRoutes";
import { auditRoutes } from "./routes/auditRoutes";
import { attackLabRoutes } from "./routes/attackLabRoutes";
import { statsRoutes } from "./routes/statsRoutes";
import { v4 as uuidv4 } from "uuid";
const PORT = process.env.PORT ?? 3001;
export function createApp() {
    const app = express();
    app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
    app.use((_req, res, next) => {
        const requestId = uuidv4();
        res.setHeader("X-Request-Id", requestId);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
        next();
    });
    app.use(express.json({ limit: "2mb" }));
    app.use("/api/demo", demoRoutes);
    app.use("/api/agentguard", proposalRoutes);
    app.use("/api/approvals", approvalRoutes);
    app.use("/api/vendors", vendorRoutes);
    app.use("/api/audit", auditRoutes);
    app.use("/api/attack-lab", attackLabRoutes);
    app.use("/api/stats", statsRoutes);
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", service: "Sova Backend", time: new Date().toISOString() });
    });
    return app;
}
const app = createApp();
export async function startServer() {
    await initPrisma();
    console.log("Database initialized");
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════╗
║         Sova Backend                     ║
║   Transaction Firewall for AI Agents     ║
╚══════════════════════════════════════════╝

Listening on http://localhost:${PORT}
Company: Northstar Studio Pte Ltd
Agent:   Accounts Payable Agent

API endpoints:
  GET  /api/health
  GET  /api/demo/emails
  POST /api/demo/emails/:id/process
  POST /api/agentguard/proposals
  GET  /api/approvals
  POST /api/approvals/:id/approve
  POST /api/approvals/:id/reject
  GET  /api/vendors
  GET  /api/audit
  GET  /api/audit/verify
  GET  /api/audit/export.csv
  POST /api/attack-lab/run
  GET  /api/stats
`);
    });
}
if (process.env.VITEST === undefined && process.env.VERCEL !== "1") {
    startServer().catch((err) => {
        console.error("Startup failed:", err);
        process.exit(1);
    });
}
export default app;
