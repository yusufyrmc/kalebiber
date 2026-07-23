/**
 * Sunucu tarafı Supabase — JWT doğrulama, profil tablosu ve DB CRUD işlemleri
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

/* ——— Supabase DB CRUD İşlemleri ——— */

async function fetchProductsFromDb() {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: true });
  if (error) {
    console.error("Supabase products read error:", error.message);
    return null;
  }
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    desc: p.desc || "",
    price: Number(p.price) || 0,
    unit: p.unit || "kg",
    emoji: p.emoji || "🫑",
    theme: p.theme || "sweet",
    badge: p.badge || "",
    category: p.category || "genel",
    imageUrl: p.image_url || p.imageUrl || "",
    stock: Number(p.stock) || 0,
    active: p.active !== false,
    featured: Boolean(p.featured),
  }));
}

async function saveProductToDb(p) {
  const sb = getAdmin();
  if (!sb) return;
  const row = {
    id: p.id,
    name: p.name,
    desc: p.desc || "",
    price: p.price,
    unit: p.unit,
    emoji: p.emoji,
    theme: p.theme,
    badge: p.badge,
    category: p.category,
    image_url: p.imageUrl || "",
    stock: p.stock,
    active: p.active,
    featured: p.featured,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("products").upsert(row, { onConflict: "id" });
  if (error) console.error("Supabase product upsert error:", error.message);
}

async function deleteProductFromDb(id) {
  const sb = getAdmin();
  if (!sb) return;
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) console.error("Supabase product delete error:", error.message);
}

async function fetchSettingsFromDb() {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from("settings").select("*").eq("id", "default").maybeSingle();
  if (error) {
    console.error("Supabase settings read error:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    storeName: data.store_name || data.storeName || "",
    tagline: data.tagline || "",
    phone: data.phone || "",
    email: data.email || "",
    shippingFee: Number(data.shipping_fee ?? data.shippingFee) || 0,
    freeShippingOver: Number(data.free_shipping_over ?? data.freeShippingOver) || 0,
    announcement: data.announcement || "",
    address: data.address || "",
    instagram: data.instagram || "",
    whatsapp: data.whatsapp || "",
    about: data.about || {},
    navbar: data.navbar || {},
  };
}

async function saveSettingsToDb(s) {
  const sb = getAdmin();
  if (!sb) return;
  const row = {
    id: "default",
    store_name: s.storeName,
    tagline: s.tagline,
    phone: s.phone,
    email: s.email,
    shipping_fee: s.shippingFee,
    free_shipping_over: s.freeShippingOver,
    announcement: s.announcement,
    address: s.address,
    instagram: s.instagram,
    whatsapp: s.whatsapp,
    about: s.about,
    navbar: s.navbar,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("settings").upsert(row, { onConflict: "id" });
  if (error) console.error("Supabase settings upsert error:", error.message);
}

async function fetchOrdersFromDb() {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase orders read error:", error.message);
    return null;
  }
  return data.map((o) => ({
    id: o.id,
    userId: o.user_id || o.userId || null,
    status: o.status,
    statusHistory: o.status_history || o.statusHistory || [],
    customer: o.customer || {},
    items: o.items || [],
    subtotal: Number(o.subtotal) || 0,
    shippingFee: Number(o.shipping_fee ?? o.shippingFee) || 0,
    total: Number(o.total) || 0,
    paymentMethod: o.payment_method || o.paymentMethod || "kapida",
    note: o.note || "",
    trackingCode: o.tracking_code || o.trackingCode || "",
    adminNote: o.admin_note || o.adminNote || "",
    createdAt: o.created_at || o.createdAt,
    updatedAt: o.updated_at || o.updatedAt,
  }));
}

async function saveOrderToDb(o) {
  const sb = getAdmin();
  if (!sb) return;
  const row = {
    id: o.id,
    user_id: o.userId || null,
    status: o.status,
    status_history: o.statusHistory || [],
    customer: o.customer || {},
    items: o.items || [],
    subtotal: o.subtotal,
    shipping_fee: o.shippingFee,
    total: o.total,
    payment_method: o.paymentMethod,
    note: o.note || "",
    tracking_code: o.trackingCode || "",
    admin_note: o.adminNote || "",
    created_at: o.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("orders").upsert(row, { onConflict: "id" });
  if (error) console.error("Supabase order upsert error:", error.message);
}

async function deleteOrderFromDb(id) {
  const sb = getAdmin();
  if (!sb) return;
  const { error } = await sb.from("orders").delete().eq("id", id);
  if (error) console.error("Supabase order delete error:", error.message);
}

async function fetchReviewsFromDb() {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase reviews read error:", error.message);
    return null;
  }
  return data.map((r) => ({
    id: r.id,
    productId: r.product_id || r.productId,
    author: r.author,
    rating: r.rating,
    text: r.text,
    approved: Boolean(r.approved),
    createdAt: r.created_at || r.createdAt,
  }));
}

async function saveReviewToDb(r) {
  const sb = getAdmin();
  if (!sb) return;
  const row = {
    id: r.id,
    product_id: r.productId,
    author: r.author,
    rating: r.rating,
    text: r.text,
    approved: r.approved,
    created_at: r.createdAt || new Date().toISOString(),
  };
  const { error } = await sb.from("reviews").upsert(row, { onConflict: "id" });
  if (error) console.error("Supabase review upsert error:", error.message);
}

async function deleteReviewFromDb(id) {
  const sb = getAdmin();
  if (!sb) return;
  const { error } = await sb.from("reviews").delete().eq("id", id);
  if (error) console.error("Supabase review delete error:", error.message);
}

async function fetchFinanceFromDb() {
  const sb = getAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from("finance_transactions").select("*").order("date", { ascending: false });
  if (error) {
    console.error("Supabase finance read error:", error.message);
    return null;
  }
  return data.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    amount: Number(t.amount) || 0,
    description: t.description || "",
    date: t.date,
    orderId: t.order_id || t.orderId || "",
    createdAt: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt,
  }));
}

async function saveFinanceToDb(t) {
  const sb = getAdmin();
  if (!sb) return;
  const row = {
    id: t.id,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description || "",
    date: t.date,
    order_id: t.orderId || null,
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("finance_transactions").upsert(row, { onConflict: "id" });
  if (error) console.error("Supabase finance upsert error:", error.message);
}

async function deleteFinanceFromDb(id) {
  const sb = getAdmin();
  if (!sb) return;
  const { error } = await sb.from("finance_transactions").delete().eq("id", id);
  if (error) console.error("Supabase finance delete error:", error.message);
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
  fetchProductsFromDb,
  saveProductToDb,
  deleteProductFromDb,
  fetchSettingsFromDb,
  saveSettingsToDb,
  fetchOrdersFromDb,
  saveOrderToDb,
  deleteOrderFromDb,
  fetchReviewsFromDb,
  saveReviewToDb,
  deleteReviewFromDb,
  fetchFinanceFromDb,
  saveFinanceToDb,
  deleteFinanceFromDb,
};
