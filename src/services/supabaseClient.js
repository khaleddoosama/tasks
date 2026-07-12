import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Exported for the keepalive flush path (raw fetch on page unload) — the
// supabase-js client can't be used there because its requests get aborted
// when the tab closes.
export const supabaseUrl = url || "https://placeholder.supabase.co";
export const supabaseAnonKey = key || "placeholder-key-not-configured";

// If credentials aren't configured yet, export a placeholder so the app
// doesn't crash on load — auth features simply won't work until .env.local
// contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.
export const supabase =
  url && key
    ? createClient(url, key)
    : createClient("https://placeholder.supabase.co", "placeholder-key-not-configured");
