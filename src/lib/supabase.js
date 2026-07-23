import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Strip trailing /rest/v1 if accidentally included in env
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseKey = serviceKey || anonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Auth işlemleri (signUp, signIn) her zaman anonKey ile yapılmalıdır (service_role key auth.signUp desteklemez)
export const supabaseAuth = isSupabaseConfigured
  ? createClient(supabaseUrl, anonKey || supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

if (process.env.NODE_ENV !== "production") {
  console.log("[Supabase] configured:", isSupabaseConfigured, "| URL:", supabaseUrl || "(missing)");
}
