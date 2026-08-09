import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../index";
describe("HTTP API integration", () => {
    const app = createApp();
    it("reports a healthy service without requiring a database write", async () => {
        const response = await request(app).get("/api/health");
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ status: "ok", service: "Sova Backend" });
        expect(new Date(response.body.time).toString()).not.toBe("Invalid Date");
    });
    it("rejects an invalid payment proposal at the HTTP boundary", async () => {
        const response = await request(app)
            .post("/api/agentguard/proposals")
            .send({ action: null, source: null });
        expect(response.status).toBeGreaterThanOrEqual(400);
    });
});
