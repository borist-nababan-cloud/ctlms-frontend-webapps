/**
 * Detects basic HTML tags or dangerous Javascript script strings.
 * Returns true if HTML/script tags or protocols are detected.
 */
export const containsHtmlOrScript = (value: string | null | undefined): boolean => {
    if (!value) return false;
    const trimmed = value.trim();
    // Regex to detect HTML tags (e.g., <script>, <img>, etc.) or javascript: protocols
    const htmlOrScriptPattern = /<[^>]+>|javascript:/i;
    return htmlOrScriptPattern.test(trimmed);
};
