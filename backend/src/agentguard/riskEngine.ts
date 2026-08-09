import { RiskSignal } from "./schemas";
export interface RiskEngineResult {
    riskScore: number;
    decision: "ALLOW" | "REQUIRE_APPROVAL";
    hardPoliciesTriggered: string[];
}
const RISK_THRESHOLD = 50;
export function computeRisk(contentSignals: RiskSignal[], behavioralSignals: RiskSignal[], systemSignals: RiskSignal[], hardPoliciesTriggered: string[]): RiskEngineResult {
    const contentScore = contentSignals.reduce((sum, s) => sum + s.severity, 0);
    const behavioralScore = behavioralSignals.reduce((sum, s) => sum + s.severity, 0);
    const systemScore = systemSignals.reduce((sum, s) => sum + s.severity, 0);
    const riskScore = contentScore + behavioralScore + systemScore;
    const requiresApprovalByHardPolicy = hardPoliciesTriggered.length > 0;
    const requiresApprovalByScore = riskScore >= RISK_THRESHOLD;
    const decision: "ALLOW" | "REQUIRE_APPROVAL" = requiresApprovalByHardPolicy || requiresApprovalByScore
        ? "REQUIRE_APPROVAL"
        : "ALLOW";
    return { riskScore, decision, hardPoliciesTriggered };
}
