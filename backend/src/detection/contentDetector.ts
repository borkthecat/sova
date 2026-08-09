import { RiskSignal, SourceContext } from "../agentguard/schemas";
import { normalizeContent } from "./normalization";
import { runContentRules } from "./contentRules";
export interface ContentAnalysisResult {
    signals: RiskSignal[];
    normalizedText: string;
    hiddenText: string;
    visibleText: string;
}
export function analyzeContent(source: SourceContext): ContentAnalysisResult {
    const rawText = (source.rawContent && source.rawContent.trim().length > 0)
        ? source.rawContent
        : source.normalizedText ?? "";
    const normalized = normalizeContent(rawText);
    const identitySignals = checkIdentityAnomalies(source);
    const contentSignals = runContentRules(normalized.normalizedText);
    return {
        signals: [...contentSignals, ...identitySignals],
        normalizedText: normalized.normalizedText,
        hiddenText: normalized.hiddenText,
        visibleText: normalized.visibleText,
    };
}
function checkIdentityAnomalies(source: SourceContext): RiskSignal[] {
    const signals: RiskSignal[] = [];
    if (source.sender && source.replyTo) {
        const senderDomain = extractDomain(source.sender);
        const replyToDomain = extractDomain(source.replyTo);
        if (senderDomain && replyToDomain && senderDomain !== replyToDomain) {
            signals.push({
                id: "REPLY_TO_MISMATCH",
                category: "CONTENT",
                severity: 25,
                title: "Reply-To domain mismatch",
                explanation: `The sender domain (${senderDomain}) does not match the Reply-To domain (${replyToDomain}). This is a common phishing indicator.`,
                evidence: `Sender: ${source.sender}, Reply-To: ${source.replyTo}`,
            });
        }
    }
    return signals;
}
function extractDomain(email: string): string | null {
    const match = email.match(/@([a-z0-9.\-]+)/i);
    return match?.[1]?.toLowerCase() ?? null;
}
