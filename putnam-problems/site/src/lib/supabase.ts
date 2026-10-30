import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Browser client for syncing solved problems. Null when the keys are not
 * configured, so the site still builds and falls back to local-only progress.
 * The publishable key is safe to ship: row-level security limits every user
 * to their own rows in `solved`.
 */
export const supabase = url && key ? createClient(url, key, { auth: { flowType: "pkce" } }) : null;
