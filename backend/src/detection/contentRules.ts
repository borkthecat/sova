import { RiskSignal } from "../agentguard/schemas";
interface ContentRule {
    id: string;
    category: "CONTENT";
    severity: number;
    title: string;
    patterns: RegExp[];
    explanation: (match: string) => string;
}
export const CONTENT_RULES: ContentRule[] = [
    {
        id: "OVERRIDE_POLICY",
        category: "CONTENT",
        severity: 35,
        title: "Payment policy override instruction",
        patterns: [
            /override\s+(?:normal|payment|verification|approval|security)\s+(?:procedures?|policies?|instructions?|controls?)/i,
            /override\s+(?:prior|previous|existing)\s+(?:policies?|instructions?|controls?)/i,
            /ignore\s+(?:prior|previous|all|normal|payment|verification)\s+(?:verification|policies?|instructions?|procedures?)/i,
            /bypass\s+(?:the\s+)?(?:approval|verification|security|payment)\s+(?:process|procedure|policy|check)/i,
            /ignore\s+prior\s+payment/i,
            /override\s+payment\s+policy/i,
        ],
        explanation: (m) => `The source contains a policy override instruction: "${m}"`,
    },
    {
        id: "IGNORE_INSTRUCTIONS",
        category: "CONTENT",
        severity: 35,
        title: "System instruction override",
        patterns: [
            /ignore\s+(?:previous|prior|all|system)\s+instructions?/i,
            /disregard\s+(?:previous|prior|all|system)\s+instructions?/i,
            /forget\s+(?:previous|prior|all|system)\s+instructions?/i,
        ],
        explanation: (m) => `The source attempts to override system instructions: "${m}"`,
    },
    {
        id: "TREAT_AS_VERIFIED",
        category: "CONTENT",
        severity: 35,
        title: "Account verification bypass",
        patterns: [
            /treat\s+(?:the\s+)?(?:new|this|updated?)\s+(?:bank\s+)?account\s+as\s+(?:already\s+)?verified/i,
            /treat\s+(?:the\s+)?(?:new\s+)?(?:banking?\s+)?details?\s+as\s+(?:already\s+)?(?:verified|approved|confirmed)/i,
            /mark\s+(?:the\s+)?(?:account|bank\s+account)\s+as\s+(?:verified|trusted|approved)/i,
            /consider\s+(?:this|the)\s+account\s+(?:as\s+)?verified/i,
            /account\s+(?:is|has\s+been)\s+(?:already\s+)?verified/i,
        ],
        explanation: (m) => `The source instructs that a bank account be treated as verified without proper verification: "${m}"`,
    },
    {
        id: "BYPASS_CONFIRMATION",
        category: "CONTENT",
        severity: 30,
        title: "Human confirmation bypass",
        patterns: [
            /do\s+not\s+(?:request|ask\s+for|require)\s+human\s+confirm/i,
            /do\s+not\s+(?:contact|notify|inform|involve)\s+(?:finance|accounts|the\s+team|management|anyone)/i,
            /skip\s+(?:the\s+)?(?:approval|verification|confirmation)\s+(?:step|process|check)/i,
            /no\s+(?:need\s+for|need\s+to|approval|confirmation|verification)\s+(?:required|needed|necessary)/i,
            /without\s+(?:any\s+)?(?:further\s+)?(?:approval|confirmation|verification)/i,
            /do\s+not\s+ask\s+for\s+confirm/i,
        ],
        explanation: (m) => `The source instructs bypassing human confirmation: "${m}"`,
    },
    {
        id: "SKIP_VERIFICATION",
        category: "CONTENT",
        severity: 30,
        title: "Verification skip instruction",
        patterns: [
            /skip\s+(?:the\s+)?(?:verification|validation|check)/i,
            /use\s+(?:these|the\s+new|updated?)\s+(?:bank(?:ing)?\s+)?details?\s+(?:instead|directly|immediately)/i,
            /process\s+(?:this\s+)?(?:payment|invoice|transaction)\s+(?:immediately\s+)?(?:without|regardless)/i,
        ],
        explanation: (m) => `The source requests skipping verification: "${m}"`,
    },
    {
        id: "APPROVED_BYPASS",
        category: "CONTENT",
        severity: 25,
        title: "False approval claim",
        patterns: [
            /(?:treat|consider)\s+this\s+(?:payment|transaction)\s+as\s+(?:already\s+)?approved/i,
            /payment\s+(?:is|has\s+been)\s+(?:already\s+)?approved/i,
            /pre[\-\s]?approved/i,
            /execute\s+(?:regardless|immediately|now)\s+(?:of|without)\s+(?:policy|approval|verification)/i,
        ],
        explanation: (m) => `The source falsely claims the payment is already approved: "${m}"`,
    },
    {
        id: "URGENCY",
        category: "CONTENT",
        severity: 5,
        title: "Urgency pressure",
        patterns: [
            /(?:process|send|pay|complete|execute)\s+(?:this\s+)?(?:payment|invoice|transaction|update)?\s*(?:immediately|right\s+away|straight\s+away|asap|as\s+soon\s+as\s+possible)/i,
            /(?:payment|invoice)\s+(?:is\s+)?(?:due|overdue|past\s+due)\s+(?:today|now|immediately)/i,
            /(?:urgent(?:ly)?|emergency|critical)[\s:]/i,
            /must\s+(?:be\s+)?(?:sent|processed|paid|completed)\s+(?:today|immediately|now|asap)/i,
            /do\s+not\s+delay/i,
            /time[\-\s]sensitive/i,
            /\bimmediately\b/i,
            /payment\s+is\s+due\s+today/i,
        ],
        explanation: (m) => `The source creates urgency pressure: "${m}"`,
    },
    {
        id: "SECRECY",
        category: "CONTENT",
        severity: 10,
        title: "Secrecy instruction",
        patterns: [
            /keep\s+this\s+(?:payment|transaction|transfer|update)?\s*confidential/i,
            /do\s+not\s+(?:mention|discuss|disclose|share)\s+(?:this|the\s+payment|the\s+transfer)/i,
            /(?:strictly\s+)?confidential/i,
            /do\s+not\s+tell\s+(?:anyone|others|colleagues|management)/i,
        ],
        explanation: (m) => `The source requests secrecy: "${m}"`,
    },
    {
        id: "AUTHORITY_IMPERSONATION",
        category: "CONTENT",
        severity: 15,
        title: "Authority impersonation",
        patterns: [
            /(?:ceo|cfo|coo|president|director|executive|board)\s+(?:has\s+)?(?:already\s+)?approved/i,
            /on\s+behalf\s+of\s+(?:the\s+)?(?:ceo|cfo|president|director|management|executive team)/i,
            /(?:directly\s+)?authorized\s+by\s+(?:the\s+)?(?:ceo|cfo|management|executive)/i,
            /senior\s+management\s+(?:has\s+)?(?:approved|requested|instructed)/i,
        ],
        explanation: (m) => `The source impersonates authority to pressure payment: "${m}"`,
    },
    {
        id: "AI_PROCESSING_INSTRUCTION",
        category: "CONTENT",
        severity: 40,
        title: "Embedded AI processing instruction",
        patterns: [
            /ai\s+(?:processing\s+)?instruction/i,
            /\[ai\s*(?:agent|instruction|command|task)\]/i,
            /ai\s+agent[:\s]+(?:please|ignore|override|treat|do\s+not)/i,
            /system\s+instruction[:\s]+/i,
            /\<\s*(?:system|instruction|command|ai_instruction)\s*\>/i,
        ],
        explanation: (m) => `The source contains embedded AI processing instructions: "${m}"`,
    },
];
export function runContentRules(normalizedText: string): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const fired = new Set<string>();
    for (const rule of CONTENT_RULES) {
        if (fired.has(rule.id))
            continue;
        for (const pattern of rule.patterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                const evidence = match[0].trim().slice(0, 200);
                signals.push({
                    id: rule.id,
                    category: rule.category,
                    severity: rule.severity,
                    title: rule.title,
                    explanation: rule.explanation(evidence),
                    evidence,
                });
                fired.add(rule.id);
                break;
            }
        }
    }
    return signals;
}
