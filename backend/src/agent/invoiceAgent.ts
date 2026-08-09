import { AgentAction, SourceContext } from "../agentguard/schemas";
import { extractFromEmail } from "./extraction";
export interface AgentProposal {
    action: AgentAction;
    source: SourceContext;
}
export async function processInvoice(source: SourceContext): Promise<AgentProposal> {
    const extracted = extractFromEmail(source);
    return {
        action: extracted,
        source,
    };
}
