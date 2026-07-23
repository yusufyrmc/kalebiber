import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Strip trailing /rest/v1 if accidentally included in env
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey);

// Standard Client-Side Supabase Client (Anon Key with Session Persistence)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Server-Side / Admin Supabase Client (Service Role Key if available, else Anon Key)
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, serviceKey || anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  console.log("[Supabase] Configured:", isSupabaseConfigured, "| URL:", supabaseUrl || "(missing)");
}

