import { initPrisma } from "../database/client";
import { evaluateProposal } from "../agentguard/interceptor";
import { EVAL_SCENARIOS } from "./scenarios";
interface EvalResult {
    name: string;
    category: string;
    expected: string;
    actual: string;
    pass: boolean;
    riskScore: number;
    signals: string[];
}
async function runEvaluation() {
    await initPrisma();
    console.log("Sova Regression Evaluation");
    console.log("─".repeat(60));
    console.log(`Scenarios: ${EVAL_SCENARIOS.length}`);
    console.log();
    const results: EvalResult[] = [];
    for (const scenario of EVAL_SCENARIOS) {
        try {
            const evaluation = await evaluateProposal(scenario.proposal);
            const pass = evaluation.decision === scenario.expectedDecision;
            const signalIds = [
                ...evaluation.contentSignals.map((s) => s.id),
                ...evaluation.behavioralSignals.map((s) => s.id),
                ...evaluation.systemSignals.map((s) => s.id),
            ];
            results.push({
                name: scenario.name,
                category: scenario.category,
                expected: scenario.expectedDecision,
                actual: evaluation.decision,
                pass,
                riskScore: evaluation.riskScore,
                signals: signalIds,
            });
            if (!pass) {
                console.log(`  FAIL  ${scenario.name}`);
                console.log(`        Expected: ${scenario.expectedDecision}, Got: ${evaluation.decision} (score: ${evaluation.riskScore})`);
                console.log(`        Signals: ${signalIds.join(", ") || "none"}`);
            }
        }
        catch (err) {
            console.error(`  ERROR  ${scenario.name}: ${err}`);
            results.push({
                name: scenario.name,
                category: scenario.category,
                expected: scenario.expectedDecision,
                actual: "ERROR",
                pass: false,
                riskScore: 0,
                signals: [],
            });
        }
    }
    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    const failed = total - passed;
    const dangerous = results.filter((r) => r.expected === "REQUIRE_APPROVAL");
    const dangerousCorrectlyHeld = dangerous.filter((r) => r.pass).length;
    const dangerousIncorrectlyAllowed = dangerous.filter((r) => !r.pass && r.actual === "ALLOW").length;
    const legitimate = results.filter((r) => r.expected === "ALLOW");
    const legitimateCorrectlyAllowed = legitimate.filter((r) => r.pass).length;
    const legitimateUnnecessarilyHeld = legitimate.filter((r) => !r.pass && r.actual === "REQUIRE_APPROVAL").length;
    const precision = dangerous.length > 0
        ? ((dangerousCorrectlyHeld / (dangerousCorrectlyHeld + (dangerous.length - dangerousCorrectlyHeld))) * 100).toFixed(1)
        : "N/A";
    const recall = dangerous.length > 0
        ? ((dangerousCorrectlyHeld / dangerous.length) * 100).toFixed(1)
        : "N/A";
    const unsafeAllowRate = dangerous.length > 0
        ? ((dangerousIncorrectlyAllowed / dangerous.length) * 100).toFixed(1)
        : "0.0";
    const legitimateReviewRate = legitimate.length > 0
        ? ((legitimateUnnecessarilyHeld / legitimate.length) * 100).toFixed(1)
        : "0.0";
    console.log("\n" + "─".repeat(60));
    console.log("Sova Regression Evaluation Results");
    console.log("─".repeat(60));
    console.log(`Cases: ${total}`);
    console.log();
    console.log(`Dangerous actions correctly held:     ${dangerousCorrectlyHeld} / ${dangerous.length}`);
    console.log(`Dangerous actions incorrectly allowed: ${dangerousIncorrectlyAllowed}`);
    console.log();
    console.log(`Legitimate actions correctly allowed:  ${legitimateCorrectlyAllowed} / ${legitimate.length}`);
    console.log(`Legitimate actions unnecessarily held: ${legitimateUnnecessarilyHeld}`);
    console.log();
    console.log(`Recall (dangerous detection):  ${recall}%`);
    console.log(`Precision (hold accuracy):     ${precision}%`);
    console.log();
    console.log(`⚠  Unsafe allow rate:          ${unsafeAllowRate}%  (lower is better)`);
    console.log(`✓  Legitimate review rate:     ${legitimateReviewRate}%  (lower is better)`);
    console.log();
    if (dangerousIncorrectlyAllowed === 0) {
        console.log("✅ Zero unsafe allows — all dangerous actions were correctly held.");
    }
    else {
        console.log(`❌ ${dangerousIncorrectlyAllowed} dangerous action(s) were incorrectly allowed.`);
    }
    if (legitimateUnnecessarilyHeld === 0) {
        console.log("✅ Zero false positives — all legitimate payments flow through automatically.");
    }
    else {
        console.log(`⚠  ${legitimateUnnecessarilyHeld} legitimate payment(s) were unnecessarily held.`);
    }
    console.log("─".repeat(60));
    const categories = new Set(results.map((r) => r.category));
    console.log("\nCategory breakdown:");
    for (const cat of categories) {
        const catResults = results.filter((r) => r.category === cat);
        const catPassed = catResults.filter((r) => r.pass).length;
        console.log(`  ${cat.padEnd(30)} ${catPassed}/${catResults.length}`);
    }
    process.exit(failed > 0 ? 1 : 0);
}
runEvaluation().catch((err) => {
    console.error("Evaluation failed:", err);
    process.exit(1);
});
