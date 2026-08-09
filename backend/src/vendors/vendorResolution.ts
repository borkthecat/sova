import { getAllVendors } from "./vendorService";
export interface VendorResolutionInput {
    claimedVendorId?: string;
    claimedVendorName?: string;
    senderEmail?: string;
    senderDomain?: string;
    invoiceVendorName?: string;
}
export interface VendorResolutionResult {
    status: "MATCHED" | "AMBIGUOUS" | "UNKNOWN";
    vendorId?: string;
    vendorName?: string;
    confidenceReasons: string[];
    matchedBy: Array<"TRUSTED_ID" | "EXACT_NAME" | "VERIFIED_DOMAIN" | "VERIFIED_EMAIL">;
}
const normalize = (value?: string | null) => value?.trim().toLocaleLowerCase();
export async function resolveVendorIdentity(input: VendorResolutionInput): Promise<VendorResolutionResult> {
    const vendors = await getAllVendors();
    const sender = normalize(input.senderEmail);
    const domain = normalize(input.senderDomain ?? sender?.split("@")[1]);
    const name = normalize(input.invoiceVendorName ?? input.claimedVendorName);
    const byId = input.claimedVendorId ? vendors.find((vendor) => vendor.id === input.claimedVendorId) : undefined;
    const byEmail = sender ? vendors.filter((vendor) => normalize(vendor.email) === sender) : [];
    const byDomain = domain ? vendors.filter((vendor) => normalize(vendor.domain) === domain) : [];
    const byName = name ? vendors.filter((vendor) => normalize(vendor.name) === name) : [];
    const identityMatches = [...new Set([...byEmail, ...byDomain, ...byName].map((vendor) => vendor.id))];
    if (identityMatches.length === 1) {
        const vendor = vendors.find((candidate) => candidate.id === identityMatches[0])!;
        if (byId && byId.id !== vendor.id) {
            return { status: "AMBIGUOUS", confidenceReasons: ["The claimed vendor ID conflicts with the verified sender identity."], matchedBy: [] };
        }
        if (byDomain.length === 1 && byName.length === 1 && byDomain[0].id !== byName[0].id) {
            return { status: "AMBIGUOUS", confidenceReasons: ["The claimed name conflicts with the verified sender domain."], matchedBy: [] };
        }
        const matchedBy: VendorResolutionResult["matchedBy"] = [];
        if (byId?.id === vendor.id)
            matchedBy.push("TRUSTED_ID");
        if (byEmail.some((candidate) => candidate.id === vendor.id))
            matchedBy.push("VERIFIED_EMAIL");
        if (byDomain.some((candidate) => candidate.id === vendor.id))
            matchedBy.push("VERIFIED_DOMAIN");
        if (byName.some((candidate) => candidate.id === vendor.id))
            matchedBy.push("EXACT_NAME");
        return { status: "MATCHED", vendorId: vendor.id, vendorName: vendor.name, matchedBy, confidenceReasons: ["Exact match against trusted vendor metadata."] };
    }
    if (identityMatches.length > 1 || (byId && (byEmail.length > 0 || byDomain.length > 0 || byName.length > 0))) {
        return { status: "AMBIGUOUS", confidenceReasons: ["More than one trusted vendor record could match this proposal."], matchedBy: [] };
    }
    return { status: "UNKNOWN", confidenceReasons: ["No exact trusted vendor identity matched the supplied evidence."], matchedBy: [] };
}
