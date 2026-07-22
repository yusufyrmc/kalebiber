/**
 * Tarayıcı Supabase istemcisi
 * URL ve anon key: sunucunun enjekte ettiği window.__KALE_SUPABASE_* veya /api/config
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm";

let client = null;

export function isSupabaseConfigured() {
  return Boolean(
    typeof window !== "undefined" && window.__KALE_SUPABASE_URL__ && window.__KALE_SUPABASE_ANON_KEY__
  );
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const url = String(window.__KALE_SUPABASE_URL__).replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    client = createClient(url, window.__KALE_SUPABASE_ANON_KEY__, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
