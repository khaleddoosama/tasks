import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If credentials aren't configured yet, export a placeholder so the app
// doesn't crash on load — auth features simply won't work until .env.local
// contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.
export const supabase =
  url && key
    ? createClient(url, key)
    : createClient("https://placeholder.supabase.co", "placeholder-key-not-configured");
