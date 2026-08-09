export interface NormalizedContent {
    rawContent: string;
    visibleText: string;
    normalizedText: string;
    hiddenText: string;
    metadata: Record<string, string>;
}
function stripHtml(html: string): string {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function extractHiddenContent(raw: string): string {
    const hidden: string[] = [];
    const hiddenMatches = raw.matchAll(/style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|color\s*:\s*white|font-size\s*:\s*[01](?:px|pt))[^"']*["'][^>]*>([\s\S]*?)<\//gi);
    for (const m of hiddenMatches) {
        if (m[1])
            hidden.push(stripHtml(m[1]));
    }
    const commentMatches = raw.matchAll(/<!--([\s\S]*?)-->/g);
    for (const m of commentMatches) {
        if (m[1]?.trim())
            hidden.push(m[1].trim());
    }
    return hidden.join(" ").trim();
}
function removeZeroWidth(text: string): string {
    return text
        .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "")
        .replace(/\u00A0/g, " ");
}
function normalizeForDetection(text: string): string {
    return removeZeroWidth(text.normalize("NFKC"))
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
export function normalizeContent(raw: string): NormalizedContent {
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(raw);
    let visibleText: string;
    let hiddenText: string;
    if (looksLikeHtml) {
        visibleText = stripHtml(raw);
        hiddenText = extractHiddenContent(raw);
    }
    else {
        visibleText = removeZeroWidth(raw.normalize("NFKC")).replace(/\s+/g, " ").trim();
        hiddenText = "";
    }
    const combined = [visibleText, hiddenText].filter(Boolean).join(" ");
    const normalizedText = normalizeForDetection(combined);
    return {
        rawContent: raw,
        visibleText,
        normalizedText,
        hiddenText,
        metadata: {},
    };
}
