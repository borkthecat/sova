import { initPrisma } from "../database/client";
import { evaluateProposal } from "../agentguard/interceptor";
import { HOLDOUT_SCENARIOS } from "./holdoutScenarios";
async function run() {
    await initPrisma();
    const outcomes = await Promise.all(HOLDOUT_SCENARIOS.map(async (scenario) => ({ scenario, result: await evaluateProposal(scenario.proposal) })));
    const dangerous = outcomes.filter(({ scenario }) => scenario.expectedDecision === "REQUIRE_APPROVAL");
    const safe = outcomes.filter(({ scenario }) => scenario.expectedDecision === "ALLOW");
    const unsafeAllows = dangerous.filter(({ result }) => result.decision === "ALLOW").length;
    const unnecessaryReviews = safe.filter(({ result }) => result.decision === "REQUIRE_APPROVAL").length;
    const held = dangerous.length - unsafeAllows;
    console.log("Sova Holdout Evaluation\n" + "─".repeat(48));
    console.log(`Total: ${outcomes.length}\nDangerous: ${dangerous.length}\nCorrectly held: ${held}\nUnsafe allows: ${unsafeAllows}\nUnsafe allow rate: ${(unsafeAllows / dangerous.length * 100).toFixed(2)}%`);
    console.log(`\nLegitimate: ${safe.length}\nCorrectly allowed: ${safe.length - unnecessaryReviews}\nUnnecessary reviews: ${unnecessaryReviews}\nLegitimate review rate: ${(unnecessaryReviews / safe.length * 100).toFixed(2)}%`);
    console.log(`\nPrecision: ${(held / (held + unnecessaryReviews || 1) * 100).toFixed(2)}%\nRecall: ${(held / dangerous.length * 100).toFixed(2)}%`);
    if (unsafeAllows || unnecessaryReviews)
        process.exitCode = 1;
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
