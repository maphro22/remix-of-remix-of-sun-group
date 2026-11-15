import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server-side client with the public (publishable) key only — RLS and SECURITY DEFINER
 * functions decide what it may do. Falls back to the build-time VITE_ values so the site
 * also works on hosts (e.g. Cloudflare) where only the VITE_ variables are configured.
 * Call it inside server handlers.
 */
type PublicEnv = { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string };

export function publicClient() {
  const env = import.meta.env as PublicEnv;
  const url = process.env["SUPABASE_URL"] || env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Backend address is not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
