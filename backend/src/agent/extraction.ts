import { AgentAction, SourceContext } from "../agentguard/schemas";
const SEEDED_EXTRACTIONS: Record<string, AgentAction> = {
    "email-apex-normal": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_apex",
        vendorName: "Apex Office Supplies",
        amount: 3500,
        currency: "SGD",
        bankAccount: "SG-8821-4410",
        invoiceId: "INV-2040",
    },
    "email-apex-urgent-legit": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_apex",
        vendorName: "Apex Office Supplies",
        amount: 3600,
        currency: "SGD",
        bankAccount: "SG-8821-4410",
        invoiceId: "INV-2041",
    },
    "email-apex-attack": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_apex",
        vendorName: "Apex Office Supplies",
        amount: 3750,
        currency: "SGD",
        bankAccount: "SG-9927-1184",
        invoiceId: "INV-2048",
    },
    "email-apex-subtle-fraud": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_apex",
        vendorName: "Apex Office Supplies",
        amount: 3450,
        currency: "SGD",
        bankAccount: "SG-5534-7723",
        invoiceId: "INV-2049",
    },
    "email-apex-duplicate": {
        type: "SEND_PAYMENT", vendorId: "vendor_apex", vendorName: "Apex Office Supplies", amount: 3500, currency: "SGD", bankAccount: "SG-8821-4410", invoiceId: "INV-2040",
    },
    "email-apex-id-confusion": {
        type: "SEND_PAYMENT", vendorId: "vendor_brightline", vendorName: "Apex Office Supplies", amount: 3750, currency: "SGD", bankAccount: "SG-9927-1184", invoiceId: "INV-2051",
    },
    "email-apex-large-payment": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_apex",
        vendorName: "Apex Office Supplies",
        amount: 12500,
        currency: "SGD",
        bankAccount: "SG-8821-4410",
        invoiceId: "INV-2050",
    },
    "email-apex-bank-update": {
        type: "UPDATE_PAYEE_BANK_DETAILS",
        vendorId: "vendor_apex",
        vendorName: "Apex Office Supplies",
        previousBankAccount: "SG-8821-4410",
        proposedBankAccount: "SG-9927-1184",
    },
    "email-brightline-normal": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_brightline",
        vendorName: "Brightline Logistics",
        amount: 2300,
        currency: "SGD",
        bankAccount: "SG-3312-0084",
        invoiceId: "INV-BL-0091",
    },
    "email-techspark-new": {
        type: "SEND_PAYMENT",
        vendorId: "vendor_techspark",
        vendorName: "TechSpark Solutions",
        amount: 1800,
        currency: "SGD",
        bankAccount: "SG-6612-3345",
        invoiceId: "INV-TS-001",
    },
};
export function extractFromEmail(source: SourceContext): AgentAction {
    if (SEEDED_EXTRACTIONS[source.sourceId]) {
        return SEEDED_EXTRACTIONS[source.sourceId];
    }
    const text = source.normalizedText ?? source.rawContent ?? "";
    return extractFromText(text, source);
}
function extractFromText(text: string, source: SourceContext): AgentAction {
    const amountMatch = text.match(/SGD\s*([\d,]+(?:\.\d{2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
    const bankMatch = text.match(/(?:account|acc\.?|bank)[:\s#]*([A-Z]{2}[-\s]?\d{4}[-\s]?\d{4})/i);
    const bankAccount = bankMatch ? bankMatch[1].replace(/\s/g, "-") : "UNKNOWN";
    const invoiceMatch = text.match(/\b(?:invoice|inv)[#:\s-]*([A-Z0-9][\w-]*)/i);
    const invoiceId = invoiceMatch
        ? (invoiceMatch[1].toUpperCase().startsWith("INV-") ? invoiceMatch[1].toUpperCase() : `INV-${invoiceMatch[1]}`)
        : undefined;
    const vendorId = guessVendorId(source.sender ?? "", text);
    const vendorName = guessVendorName(source.sender ?? "", text);
    return {
        type: "SEND_PAYMENT",
        vendorId,
        vendorName,
        amount,
        currency: "SGD",
        bankAccount,
        invoiceId,
    };
}
function guessVendorId(sender: string, text: string): string {
    const fromText = knownVendorIdFromText(text);
    if (fromText)
        return fromText;
    const normalizedSender = sender.toLowerCase();
    if (normalizedSender.includes("apex"))
        return "vendor_apex";
    if (normalizedSender.includes("brightline"))
        return "vendor_brightline";
    if (normalizedSender.includes("techspark"))
        return "vendor_techspark";
    return `vendor_unknown_${Date.now()}`;
}
function guessVendorName(sender: string, text: string): string {
    const normalizedSender = sender.toLowerCase();
    const normalizedText = text.toLowerCase();
    const fromText = knownVendorNameFromText(normalizedText);
    if (fromText)
        return fromText;
    if (normalizedSender.includes("apex"))
        return "Apex Office Supplies";
    if (normalizedSender.includes("brightline"))
        return "Brightline Logistics";
    if (normalizedSender.includes("techspark"))
        return "TechSpark Solutions";
    if (normalizedText.includes("apex office"))
        return "Apex Office Supplies";
    if (normalizedText.includes("brightline logistics"))
        return "Brightline Logistics";
    if (normalizedText.includes("techspark solutions"))
        return "TechSpark Solutions";
    const labeledVendor = text.match(/(?:vendor|supplier|company)\s*:\s*([^\r\n]+)/i)?.[1]?.trim();
    if (labeledVendor)
        return labeledVendor;
    return sender.split("@")[0] ?? "Unknown Vendor";
}
function knownVendorIdFromText(text: string): string | undefined {
    const normalizedText = text.toLowerCase();
    if (normalizedText.includes("apex office supplies"))
        return "vendor_apex";
    if (normalizedText.includes("brightline logistics"))
        return "vendor_brightline";
    if (normalizedText.includes("techspark solutions"))
        return "vendor_techspark";
    return undefined;
}
function knownVendorNameFromText(normalizedText: string): string | undefined {
    if (normalizedText.includes("apex office supplies"))
        return "Apex Office Supplies";
    if (normalizedText.includes("brightline logistics"))
        return "Brightline Logistics";
    if (normalizedText.includes("techspark solutions"))
        return "TechSpark Solutions";
    return undefined;
}
