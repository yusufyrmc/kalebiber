/**
 * Sunucu tarafı Supabase — JWT doğrulama ve profil tablosu
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = String(process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || "").trim();

const supabaseEnabled = Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));

let adminClient = null;

function serverKey() {
  return SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
}

function getAdmin() {
  if (!supabaseEnabled) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, serverKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

function getUserClient(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !accessToken) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function isSupabaseEnabled() {
  return supabaseEnabled;
}

function hasServiceRole() {
  return Boolean(SUPABASE_SERVICE_ROLE_KEY);
}

function getPublicConfig() {
  return {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    authProvider: supabaseEnabled ? "supabase" : "local",
  };
}

async function getUserFromBearerToken(token) {
  const sb = getAdmin();
  if (!sb || !token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function getProfile(userId, accessToken) {
  if (!userId) return null;
  const sb =
    accessToken && !SUPABASE_SERVICE_ROLE_KEY ? getUserClient(accessToken) : getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("profiles read:", error.message);
    return null;
  }
  return data;
}

async function upsertProfile(userId, fields, accessToken) {
  if (!userId) return null;
  const sb =
    accessToken && !SUPABASE_SERVICE_ROLE_KEY ? getUserClient(accessToken) : getAdmin();
  if (!sb) throw new Error("Supabase yapılandırılmamış");

  const row = {
    id: userId,
    updated_at: new Date().toISOString(),
  };
  if (fields.name != null) row.name = String(fields.name).trim().slice(0, 80);
  if (fields.phone != null) row.phone = String(fields.phone).trim().slice(0, 30);
  if (fields.address != null) row.address = String(fields.address).trim().slice(0, 500);
  if (fields.city != null) row.city = String(fields.city).trim().slice(0, 80);
  if (fields.email != null) row.email = String(fields.email).trim().slice(0, 80);

  const { data, error } = await sb.from("profiles").upsert(row, { onConflict: "id" }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

function publicUserFromSupabase(authUser, profile) {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email || profile?.email || "",
    name: profile?.name || meta.name || "",
    phone: profile?.phone || meta.phone || "",
    address: profile?.address || "",
    city: profile?.city || "",
    createdAt: authUser.created_at,
  };
}

function getBearerToken(req) {
  const auth = String(req.get("Authorization") || "");
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

async function resolveAuthUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  req.accessToken = token;
  return getUserFromBearerToken(token);
}

async function updateAuthPassword(userId, password) {
  if (!hasServiceRole()) {
    throw new Error("Şifre değiştirmek için SUPABASE_SERVICE_ROLE_KEY .env dosyasına eklenmeli");
  }
  const sb = getAdmin();
  const { error } = await sb.auth.admin.updateUserById(userId, { password: String(password) });
  if (error) throw new Error(error.message);
}

module.exports = {
  isSupabaseEnabled,
  hasServiceRole,
  getPublicConfig,
  getAdmin,
  getUserFromBearerToken,
  getProfile,
  upsertProfile,
  publicUserFromSupabase,
  resolveAuthUser,
  updateAuthPassword,
  getBearerToken,
};
