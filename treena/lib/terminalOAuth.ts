/**
 * Terminal link / OAuth helpers: validate full URLs before opening in a browser.
 */

export function parseTrustedHttpUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

export function isLikelyOAuthAuthorizeUrl(u: URL): boolean {
  const path = u.pathname.toLowerCase();
  if (path.includes("/oauth/authorize")) return true;
  if (path.includes("/oauth/") && path.includes("authorize")) return true;
  if (u.hostname.toLowerCase().includes("claude.com") && path.includes("oauth"))
    return true;
  return false;
}

export function validateOAuthAuthorizeUrl(
  u: URL
): { ok: true } | { ok: false; reason: string } {
  const clientId = u.searchParams.get("client_id");
  const responseType = u.searchParams.get("response_type");
  if (!clientId?.trim()) {
    return {
      ok: false,
      reason:
        "This link is missing client_id (the URL may be truncated). Use Copy, or tap the link in the terminal again.",
    };
  }
  if (!responseType?.trim()) {
    return {
      ok: false,
      reason: "This link is missing response_type and may be incomplete.",
    };
  }
  return { ok: true };
}
