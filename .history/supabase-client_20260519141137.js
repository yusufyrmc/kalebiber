/**
 * Tarayıcı Supabase istemcisi (anon key)
 */
import { createClient } from "https://jycmisyookzatuulifxl.supabase.co/rest/v1/";

let client = null;

export function isSupabaseConfigured() {
  return Boolean(
    typeof window !== "undefined" && window.__KALE_SUPABASE_URL__ && window.__KALE_SUPABASE_ANON_KEY__
  );
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(window.__KALE_SUPABASE_URL__, window.__KALE_SUPABASE_ANON_KEY__, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
