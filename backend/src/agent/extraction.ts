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
    const vendorId = guessVendorId(source.sender ?? "");
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
function guessVendorId(sender: string): string {
    if (sender.includes("apex"))
        return "vendor_apex";
    if (sender.includes("brightline"))
        return "vendor_brightline";
    return `vendor_unknown_${Date.now()}`;
}
function guessVendorName(sender: string, text: string): string {
    if (sender.toLowerCase().includes("apex"))
        return "Apex Office Supplies";
    if (sender.toLowerCase().includes("brightline"))
        return "Brightline Logistics";
    if (text.toLowerCase().includes("apex office"))
        return "Apex Office Supplies";
    if (text.toLowerCase().includes("brightline"))
        return "Brightline Logistics";
    return sender.split("@")[0] ?? "Unknown Vendor";
}
