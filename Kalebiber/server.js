/**
 * Kale Biber — e-ticaret API
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const fsp = require("fs/promises");
const crypto = require("crypto");
const multer = require("multer");
const supabaseServer = require("./lib/supabase-server");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = String(process.env.ADMIN_KEY || "").trim();
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const PRODUCTS_FILE = path.join(ROOT, "products.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");
const FINANCE_FILE = path.join(DATA_DIR, "finance.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_SECRET = String(process.env.AUTH_SECRET || process.env.ADMIN_KEY || "kale-biber-dev-secret").trim();
const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const ACTIVE_USER_MS = 5 * 60 * 1000;
const MAX_PAGE_HITS = 800;

const THEMES = ["hot", "sweet", "dry", "mixed"];
const ORDER_STATUSES = ["yeni", "hazirlaniyor", "kargoda", "teslim_edildi", "iptal"];
const PAYMENT_METHODS = ["kapida", "havale", "kart"];
const FINANCE_TYPES = ["income", "expense"];
const FINANCE_CATEGORIES = {
  income: ["siparis", "urun_satis", "diger_gelir"],
  expense: ["malzeme", "kargo", "personel", "kira", "vergi", "pazarlama", "diger_gider"],
};

let writeChain = Promise.resolve();

const DEFAULT_ABOUT = {
  title: "Hakkımızda",
  content:
    "Yarımca Kale Bibercisi olarak bahçemizden sofranıza taze ve doğal biber ürünleri sunuyoruz. Nesilden nesile aktarılan üretim bilgisi ve mevsiminde hasat anlayışıyla çalışıyoruz.",
  photos: [],
};

const DEFAULT_NAVBAR = {
  eyebrow: "Bahçeden sofraya",
  title: "Taze biber,",
  titleAccent: "gerçek lezzet",
  heroLead: "",
  imageUrl: "",
  imageAlt: "Taze kale biber",
  logoUrl: "/images/logo-yuvarlak.png",
  trustItems: ["✓ Güvenli sipariş", "✓ Hızlı kargo", "✓ Yerli üretim"],
};

const DEFAULT_SETTINGS = {
  storeName: "Yarımca Kale Bibercisi",
  tagline: "Bahçeden sofraya taze ve doğal biber",
  phone: "",
  email: "",
  shippingFee: 49,
  freeShippingOver: 500,
  announcement: "",
  address: "",
  instagram: "",
  whatsapp: "",
  about: { ...DEFAULT_ABOUT },
  navbar: { ...DEFAULT_NAVBAR },
};

function normalizeAbout(about) {
  const a = about && typeof about === "object" ? about : {};
  const photos = Array.isArray(a.photos)
    ? a.photos
        .slice(0, 12)
        .map((p) => ({
          url: String(p?.url || "").trim().slice(0, 500),
          caption: String(p?.caption || "").trim().slice(0, 200),
        }))
        .filter((p) => p.url)
    : [];
  return {
    title: String(a.title || DEFAULT_ABOUT.title).trim().slice(0, 80) || DEFAULT_ABOUT.title,
    content: String(a.content || "").slice(0, 8000),
    photos,
  };
}

function normalizeNavbar(navbar) {
  const n = navbar && typeof navbar === "object" ? navbar : {};
  const trustItems = Array.isArray(n.trustItems)
    ? n.trustItems
        .map((t) => String(t || "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 6)
    : DEFAULT_NAVBAR.trustItems;
  return {
    eyebrow: String(n.eyebrow || DEFAULT_NAVBAR.eyebrow).trim().slice(0, 80) || DEFAULT_NAVBAR.eyebrow,
    title: String(n.title || DEFAULT_NAVBAR.title).trim().slice(0, 120) || DEFAULT_NAVBAR.title,
    titleAccent: String(n.titleAccent || DEFAULT_NAVBAR.titleAccent).trim().slice(0, 80) || DEFAULT_NAVBAR.titleAccent,
    heroLead: String(n.heroLead || "").trim().slice(0, 300),
    imageUrl: String(n.imageUrl || "").trim().slice(0, 500),
    imageAlt: String(n.imageAlt || DEFAULT_NAVBAR.imageAlt).trim().slice(0, 120) || DEFAULT_NAVBAR.imageAlt,
    logoUrl: String(n.logoUrl || DEFAULT_NAVBAR.logoUrl).trim().slice(0, 500) || DEFAULT_NAVBAR.logoUrl,
    trustItems: trustItems.length ? trustItems : [...DEFAULT_NAVBAR.trustItems],
  };
}

function normalizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  merged.about = normalizeAbout(merged.about);
  merged.navbar = normalizeNavbar(merged.navbar);
  return merged;
}

function queueWrite(fn) {
  writeChain = writeChain.then(fn);
  return writeChain;
}

async function readSettings() {
  if (supabaseServer.isSupabaseEnabled()) {
    const dbSettings = await supabaseServer.fetchSettingsFromDb();
    if (dbSettings) return normalizeSettings(dbSettings);
  }
  try {
    const raw = await fsp.readFile(SETTINGS_FILE, "utf8");
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return normalizeSettings({});
  }
}

function queueWriteSettings(data) {
  return queueWrite(async () => {
    if (supabaseServer.isSupabaseEnabled()) {
      await supabaseServer.saveSettingsToDb(data);
    }
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
  });
}

function normalizeTransaction(raw, existingId) {
  const type = FINANCE_TYPES.includes(raw?.type) ? raw.type : "expense";
  const cats = FINANCE_CATEGORIES[type] || FINANCE_CATEGORIES.expense;
  const category = cats.includes(raw?.category) ? raw.category : cats[0];
  const amount = Math.round(Math.max(0, Number(raw?.amount) || 0) * 100) / 100;
  const dateStr = String(raw?.date || "").trim().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : new Date().toISOString().slice(0, 10);
  return {
    id: existingId || raw?.id || `TX-${Date.now().toString(36).toUpperCase()}`,
    type,
    category,
    amount,
    description: String(raw?.description || "").trim().slice(0, 500),
    date,
    orderId: String(raw?.orderId || "").trim().slice(0, 40),
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function readFinance() {
  if (supabaseServer.isSupabaseEnabled()) {
    const dbFinance = await supabaseServer.fetchFinanceFromDb();
    if (dbFinance) return dbFinance.map((t) => normalizeTransaction(t, t.id));
  }
  try {
    const raw = await fsp.readFile(FINANCE_FILE, "utf8");
    const data = JSON.parse(raw);
    const list = Array.isArray(data?.transactions) ? data.transactions : [];
    return list.map((t) => normalizeTransaction(t, t.id));
  } catch {
    return [];
  }
}

function queueWriteFinance(transactions) {
  return queueWrite(async () => {
    if (supabaseServer.isSupabaseEnabled()) {
      for (const t of transactions) {
        await supabaseServer.saveFinanceToDb(t);
      }
    }
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(FINANCE_FILE, JSON.stringify({ transactions }, null, 2), "utf8");
  });
}

function financeSummary(transactions, from, to) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (from && t.date < from) continue;
    if (to && t.date > to) continue;
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  income = Math.round(income * 100) / 100;
  expense = Math.round(expense * 100) / 100;
  return { income, expense, balance: Math.round((income - expense) * 100) / 100 };
}

function enrichProduct(p) {
  return {
    id: p.id,
    name: p.name,
    desc: p.desc || "",
    price: Number(p.price) || 0,
    unit: p.unit || "kg",
    emoji: p.emoji || "🫑",
    theme: THEMES.includes(p.theme) ? p.theme : "sweet",
    badge: p.badge || "",
    category: String(p.category || "genel").slice(0, 40),
    imageUrl: String(p.imageUrl || "").slice(0, 500),
    stock: Math.max(0, Math.min(99999, parseInt(p.stock, 10) || 99)),
    active: p.active !== false,
    featured: !!p.featured,
  };
}

async function readProducts() {
  if (supabaseServer.isSupabaseEnabled()) {
    const dbList = await supabaseServer.fetchProductsFromDb();
    if (dbList && dbList.length > 0) return dbList.map(enrichProduct);
  }
  const raw = await fsp.readFile(PRODUCTS_FILE, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error("products.json geçersiz");
  return list.map(enrichProduct);
}

function queueWriteProducts(list) {
  return queueWrite(async () => {
    if (supabaseServer.isSupabaseEnabled()) {
      for (const p of list) {
        await supabaseServer.saveProductToDb(p);
      }
    }
    await fsp.writeFile(PRODUCTS_FILE, JSON.stringify(list, null, 2), "utf8");
  });
}

async function readOrders() {
  if (supabaseServer.isSupabaseEnabled()) {
    const dbOrders = await supabaseServer.fetchOrdersFromDb();
    if (dbOrders) return dbOrders;
  }
  try {
    const raw = await fsp.readFile(ORDERS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function readUsersDb() {
  try {
    const raw = await fsp.readFile(USERS_FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      users: Array.isArray(data.users) ? data.users : [],
      sessions: data.sessions && typeof data.sessions === "object" ? data.sessions : {},
    };
  } catch {
    return { users: [], sessions: {} };
  }
}

function queueWriteUsersDb(db) {
  return queueWrite(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(USERS_FILE, JSON.stringify(db, null, 2), "utf8");
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const actual = crypto.scryptSync(String(password), salt, 64);
  return crypto.timingSafeEqual(expected, actual);
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone || "",
    address: u.address || "",
    city: u.city || "",
    createdAt: u.createdAt,
  };
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function getUserIdFromRequest(req) {
  if (supabaseServer.isSupabaseEnabled()) {
    const authUser = await supabaseServer.resolveAuthUser(req);
    return authUser?.id || null;
  }
  const auth = String(req.get("Authorization") || "");
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  const db = await readUsersDb();
  const sess = db.sessions[token];
  if (!sess || !sess.userId) return null;
  if (new Date(sess.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token];
    await queueWriteUsersDb(db);
    return null;
  }
  return sess.userId;
}

async function attachAuthUser(req) {
  if (supabaseServer.isSupabaseEnabled()) {
    req.authUser = await supabaseServer.resolveAuthUser(req);
    req.userId = req.authUser?.id || null;
    return;
  }
  req.userId = await getUserIdFromRequest(req);
  req.authUser = null;
}

function requireUser(req, res, next) {
  attachAuthUser(req)
    .then(() => {
      if (!req.userId) {
        return res.status(401).json({
          error: supabaseServer.isSupabaseEnabled()
            ? "Sipariş vermek için giriş yapmalısınız"
            : "Giriş yapmanız gerekiyor",
        });
      }
      next();
    })
    .catch((e) => {
      console.error(e);
      res.status(500).json({ error: "Oturum hatası" });
    });
}

async function getAccountEmailForUserId(userId, authUser) {
  if (authUser?.email) return normalizeEmail(authUser.email);
  const db = await readUsersDb();
  const user = db.users.find((u) => u.id === userId);
  return normalizeEmail(user?.email);
}

async function linkOrdersToUser(userId, email) {
  const norm = normalizeEmail(email);
  if (!userId || !norm) return;
  const orders = await readOrders();
  let changed = false;
  for (const o of orders) {
    if (o.userId) continue;
    if (normalizeEmail(o.customer?.email) === norm) {
      o.userId = userId;
      changed = true;
    }
  }
  if (changed) await queueWriteOrders(orders);
}

function orderForAccount(o) {
  return {
    id: o.id,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    trackingCode: o.trackingCode || "",
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    total: o.total,
    paymentMethod: o.paymentMethod,
    items: (o.items || []).map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      lineTotal: i.lineTotal,
    })),
  };
}

function queueWriteOrders(orders) {
  return queueWrite(async () => {
    if (supabaseServer.isSupabaseEnabled()) {
      for (const o of orders) {
        await supabaseServer.saveOrderToDb(o);
      }
    }
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
  });
}

async function readReviews() {
  if (supabaseServer.isSupabaseEnabled()) {
    const dbReviews = await supabaseServer.fetchReviewsFromDb();
    if (dbReviews) return dbReviews;
  }
  try {
    const raw = await fsp.readFile(REVIEWS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function queueWriteReviews(list) {
  return queueWrite(async () => {
    if (supabaseServer.isSupabaseEnabled()) {
      for (const r of list) {
        await supabaseServer.saveReviewToDb(r);
      }
    }
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(REVIEWS_FILE, JSON.stringify(list, null, 2), "utf8");
  });
}

function normalizeReview(body) {
  const productId = String(body.productId || "").trim();
  const author = String(body.author || "").trim().slice(0, 60);
  const text = String(body.text || "").trim().slice(0, 2000);
  let rating = Math.round(Number(body.rating));
  if (!productId) {
    const err = new Error("Ürün seçin");
    err.status = 400;
    throw err;
  }
  if (!author || author.length < 2) {
    const err = new Error("Adınız en az 2 karakter olmalı");
    err.status = 400;
    throw err;
  }
  if (!text || text.length < 10) {
    const err = new Error("Yorum en az 10 karakter olmalı");
    err.status = 400;
    throw err;
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) rating = 5;
  return {
    id: "rev-" + Date.now().toString(36) + "-" + crypto.randomBytes(2).toString("hex"),
    productId,
    author,
    rating,
    text,
    createdAt: new Date().toISOString(),
    approved: false,
  };
}

function reviewStats(reviews, approvedOnly = true) {
  const list = approvedOnly ? reviews.filter((r) => r.approved) : reviews;
  const byProduct = {};
  let totalRating = 0;
  for (const r of list) {
    if (!byProduct[r.productId]) byProduct[r.productId] = { sum: 0, count: 0 };
    byProduct[r.productId].sum += r.rating;
    byProduct[r.productId].count += 1;
    totalRating += r.rating;
  }
  const global = {
    count: list.length,
    avg: list.length ? Math.round((totalRating / list.length) * 10) / 10 : 0,
  };
  const perProduct = {};
  for (const [pid, v] of Object.entries(byProduct)) {
    perProduct[pid] = {
      count: v.count,
      avg: Math.round((v.sum / v.count) * 10) / 10,
    };
  }
  return { global, perProduct };
}

function enrichProductWithReviews(p, perProduct) {
  const s = perProduct[p.id] || { avg: 0, count: 0 };
  return { ...p, ratingAvg: s.avg, reviewCount: s.count };
}

async function readAnalytics() {
  try {
    const raw = await fsp.readFile(ANALYTICS_FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      sessions: data.sessions && typeof data.sessions === "object" ? data.sessions : {},
      daily: data.daily && typeof data.daily === "object" ? data.daily : {},
      pageHits: Array.isArray(data.pageHits) ? data.pageHits : [],
    };
  } catch {
    return { sessions: {}, daily: {}, pageHits: [] };
  }
}

function queueWriteAnalytics(data) {
  return queueWrite(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf8");
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function recordVisit(visitorId, pagePath, userAgent) {
  const vid = String(visitorId || "").trim().slice(0, 64);
  if (!vid) return;
  const pathStr = String(pagePath || "/").slice(0, 200) || "/";
  const now = new Date().toISOString();
  const data = await readAnalytics();
  const day = todayKey();

  if (!data.sessions[vid]) {
    data.sessions[vid] = {
      firstSeen: now,
      lastSeen: now,
      pageViews: 0,
      lastPath: pathStr,
      userAgent: String(userAgent || "").slice(0, 120),
    };
  }
  const sess = data.sessions[vid];
  sess.lastSeen = now;
  sess.pageViews = (sess.pageViews || 0) + 1;
  sess.lastPath = pathStr;

  if (!data.daily[day]) data.daily[day] = { pageViews: 0, visitors: [] };
  data.daily[day].pageViews = (data.daily[day].pageViews || 0) + 1;
  if (!data.daily[day].visitors.includes(vid)) data.daily[day].visitors.push(vid);

  data.pageHits.unshift({ at: now, visitorId: vid, path: pathStr });
  if (data.pageHits.length > MAX_PAGE_HITS) data.pageHits.length = MAX_PAGE_HITS;

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const k of Object.keys(data.sessions)) {
    if (new Date(data.sessions[k].lastSeen).getTime() < cutoff) delete data.sessions[k];
  }

  await queueWriteAnalytics(data);
}

function buildAnalyticsSummary(data) {
  const now = Date.now();
  const day = todayKey();
  const today = data.daily[day] || { pageViews: 0, visitors: [] };
  const activeSessions = Object.entries(data.sessions).filter(
    ([, s]) => now - new Date(s.lastSeen).getTime() < ACTIVE_USER_MS
  );
  const last7visits = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = data.daily[key] || { pageViews: 0, visitors: [] };
    last7visits.push({
      date: key,
      pageViews: row.pageViews || 0,
      uniqueVisitors: (row.visitors || []).length,
    });
  }
  const pathCounts = {};
  for (const hit of data.pageHits.slice(0, 200)) {
    pathCounts[hit.path] = (pathCounts[hit.path] || 0) + 1;
  }
  const topPages = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  return {
    activeNow: activeSessions.length,
    todayPageViews: today.pageViews || 0,
    todayUniqueVisitors: (today.visitors || []).length,
    totalSessions: Object.keys(data.sessions).length,
    chartVisits7: last7visits,
    topPages,
    activeUsers: activeSessions
      .map(([id, s]) => ({
        id: id.slice(0, 8) + "…",
        lastSeen: s.lastSeen,
        lastPath: s.lastPath,
        pageViews: s.pageViews,
      }))
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
      .slice(0, 20),
  };
}

function slugify(str) {
  const base = String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base || "urun-" + Date.now();
}

function uniqueId(baseId, existingIds) {
  let id = baseId;
  let n = 1;
  while (existingIds.has(id)) id = `${baseId}-${n++}`;
  return id;
}

function normalizeProduct(body, fixedId) {
  const name = String(body.name || "").trim();
  if (!name) {
    const err = new Error("Ürün adı gerekli");
    err.status = 400;
    throw err;
  }
  let id = fixedId != null ? String(fixedId).trim() : String(body.id || "").trim();
  if (!id) id = slugify(name);
  id = id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!id) id = "urun-" + Date.now();
  return enrichProduct({
    id,
    name,
    desc: body.desc,
    price: body.price,
    unit: body.unit,
    emoji: body.emoji,
    theme: body.theme,
    badge: body.badge,
    category: body.category,
    imageUrl: body.imageUrl,
    stock: body.stock,
    active: body.active !== false && body.active !== "false",
    featured: body.featured === true || body.featured === "true",
  });
}

function calcShipping(subtotal, settings) {
  const fee = Number(settings.shippingFee) || 0;
  const freeOver = Number(settings.freeShippingOver) || 0;
  if (freeOver > 0 && subtotal >= freeOver) return 0;
  return Math.round(fee * 100) / 100;
}

function requireAdmin(req, res, next) {
  const key = String(req.get("X-Admin-Key") || "").trim();
  if (!ADMIN_KEY) {
    return res.status(503).json({ error: "ADMIN_KEY tanımlı değil (.env)" });
  }
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Yetkisiz" });
  }
  next();
}

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fsp
        .mkdir(UPLOAD_DIR, { recursive: true })
        .then(() => cb(null, UPLOAD_DIR))
        .catch((e) => cb(e));
    },
    filename: (_req, file, cb) => {
      let ext = path.extname(file.originalname || "").toLowerCase();
      if (!ALLOWED_IMAGE_EXT.has(ext)) ext = ".jpg";
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Sadece JPG, PNG, WebP veya GIF yükleyebilirsiniz"));
  },
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key, Authorization, Content-Length");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "512kb" }));

/* ——— Public ——— */
app.get("/api/settings", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(await readSettings());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ayarlar okunamadı" });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    const [list, reviews] = await Promise.all([readProducts(), readReviews()]);
    const { perProduct } = reviewStats(reviews, true);
    res.json(list.filter((p) => p.active).map((p) => enrichProductWithReviews(p, perProduct)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ürün listesi okunamadı" });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const productId = String(req.query.productId || "").trim();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    let reviews = (await readReviews()).filter((r) => r.approved);
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (productId) reviews = reviews.filter((r) => r.productId === productId);
    const products = await readProducts();
    const nameById = Object.fromEntries(products.map((p) => [p.id, p.name]));
    res.json({
      reviews: reviews.slice(0, limit).map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: nameById[r.productId] || r.productId,
        author: r.author,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
      })),
      stats: reviewStats(await readReviews(), true).global,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Yorumlar okunamadı" });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const review = normalizeReview(req.body || {});
    const products = await readProducts();
    if (!products.some((p) => p.id === review.productId && p.active)) {
      return res.status(400).json({ error: "Ürün bulunamadı" });
    }
    const list = await readReviews();
    const recent = list.filter(
      (r) =>
        r.productId === review.productId &&
        r.author.toLowerCase() === review.author.toLowerCase() &&
        Date.now() - new Date(r.createdAt).getTime() < 60 * 60 * 1000
    );
    if (recent.length >= 2) {
      return res.status(429).json({ error: "Bu ürün için saatte en fazla 2 yorum yazabilirsiniz" });
    }
    list.unshift(review);
    await queueWriteReviews(list);
    res.status(201).json({
      ok: true,
      message: "Yorumunuz alındı. Onaylandıktan sonra yayınlanacak.",
      pending: true,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Kaydedilemedi" });
  }
});

/* ——— Müşteri hesabı ——— */
app.get("/api/config", (_req, res) => {
  res.json(supabaseServer.getPublicConfig());
});

app.post("/api/auth/profile-sync", async (req, res) => {
  try {
    if (!supabaseServer.isSupabaseEnabled()) {
      return res.status(400).json({ error: "Supabase etkin değil" });
    }
    const authUser = await supabaseServer.resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Giriş yapılmamış" });
    const b = req.body || {};
    await supabaseServer.upsertProfile(
      authUser.id,
      {
        email: authUser.email,
        name: b.name ?? authUser.user_metadata?.name,
        phone: b.phone ?? authUser.user_metadata?.phone,
        address: b.address,
        city: b.city,
      },
      req.accessToken
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Profil kaydedilemedi" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (supabaseServer.isSupabaseEnabled()) {
    return res.status(400).json({ error: "Kayıt tarayıcıdan Supabase ile yapılır" });
  }
  try {
    const { email, password, name, phone, address, city } = req.body || {};
    const normEmail = normalizeEmail(email);
    const cleanName = String(name || "").trim().slice(0, 80);
    const pwd = String(password || "");
    if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return res.status(400).json({ error: "Geçerli bir e-posta girin" });
    }
    if (pwd.length < 6) return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
    if (cleanName.length < 2) return res.status(400).json({ error: "Ad soyad en az 2 karakter olmalı" });

    const db = await readUsersDb();
    if (db.users.some((u) => normalizeEmail(u.email) === normEmail)) {
      return res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
    }

    const user = {
      id: "USR-" + crypto.randomBytes(6).toString("hex").toUpperCase(),
      email: normEmail,
      passwordHash: hashPassword(pwd),
      name: cleanName,
      phone: String(phone || "").trim().slice(0, 30),
      address: String(address || "").trim().slice(0, 500),
      city: String(city || "").trim().slice(0, 80),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);

    const token = createSessionToken();
    db.sessions[token] = {
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    await queueWriteUsersDb(db);
    await linkOrdersToUser(user.id, user.email);

    res.status(201).json({ ok: true, token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Kayıt oluşturulamadı" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (supabaseServer.isSupabaseEnabled()) {
    return res.status(400).json({ error: "Giriş tarayıcıdan Supabase ile yapılır" });
  }
  try {
    const normEmail = normalizeEmail(req.body?.email);
    const pwd = String(req.body?.password || "");
    if (!normEmail || !pwd) return res.status(400).json({ error: "E-posta ve şifre gerekli" });

    const db = await readUsersDb();
    const user = db.users.find((u) => normalizeEmail(u.email) === normEmail);
    if (!user || !verifyPassword(pwd, user.passwordHash)) {
      return res.status(401).json({ error: "E-posta veya şifre hatalı" });
    }

    const token = createSessionToken();
    db.sessions[token] = {
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    user.updatedAt = new Date().toISOString();
    await queueWriteUsersDb(db);
    await linkOrdersToUser(user.id, user.email);

    res.json({ ok: true, token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Giriş yapılamadı" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const auth = String(req.get("Authorization") || "");
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) {
      const db = await readUsersDb();
      if (db.sessions[m[1].trim()]) {
        delete db.sessions[m[1].trim()];
        await queueWriteUsersDb(db);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Çıkış yapılamadı" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    if (supabaseServer.isSupabaseEnabled()) {
      const authUser = await supabaseServer.resolveAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Giriş yapılmamış" });
      const token = req.accessToken || supabaseServer.getBearerToken(req);
      let profile = await supabaseServer.getProfile(authUser.id, token);
      if (!profile) {
        try {
          profile = await supabaseServer.upsertProfile(
            authUser.id,
            {
              email: authUser.email,
              name: authUser.user_metadata?.name || "",
              phone: authUser.user_metadata?.phone || "",
            },
            token
          );
        } catch (profileErr) {
          console.error("profiles tablosu:", profileErr.message);
          profile = {
            email: authUser.email,
            name: authUser.user_metadata?.name || "",
            phone: authUser.user_metadata?.phone || "",
            address: "",
            city: "",
          };
        }
      }
      await linkOrdersToUser(authUser.id, authUser.email);
      return res.json({ user: supabaseServer.publicUserFromSupabase(authUser, profile) });
    }
    const userId = await getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Giriş yapılmamış" });
    const db = await readUsersDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(401).json({ error: "Hesap bulunamadı" });
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Okunamadı" });
  }
});

app.patch("/api/auth/me", requireUser, async (req, res) => {
  try {
    const b = req.body || {};
    if (supabaseServer.isSupabaseEnabled()) {
      const authUser = req.authUser || (await supabaseServer.resolveAuthUser(req));
      if (!authUser) return res.status(401).json({ error: "Giriş yapılmamış" });
      if (b.name != null) {
        const n = String(b.name).trim().slice(0, 80);
        if (n.length < 2) return res.status(400).json({ error: "Ad en az 2 karakter olmalı" });
      }
      if (b.password != null) {
        const pwd = String(b.password);
        if (pwd.length < 6) return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalı" });
        await supabaseServer.updateAuthPassword(authUser.id, pwd);
      }
      const profile = await supabaseServer.upsertProfile(
        authUser.id,
        {
          email: authUser.email,
          name: b.name,
          phone: b.phone,
          address: b.address,
          city: b.city,
        },
        req.accessToken
      );
      return res.json({ ok: true, user: supabaseServer.publicUserFromSupabase(authUser, profile) });
    }
    const db = await readUsersDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) return res.status(404).json({ error: "Hesap bulunamadı" });

    if (b.name != null) {
      const n = String(b.name).trim().slice(0, 80);
      if (n.length < 2) return res.status(400).json({ error: "Ad en az 2 karakter olmalı" });
      user.name = n;
    }
    if (b.phone != null) user.phone = String(b.phone).trim().slice(0, 30);
    if (b.address != null) user.address = String(b.address).trim().slice(0, 500);
    if (b.city != null) user.city = String(b.city).trim().slice(0, 80);
    if (b.password != null) {
      const pwd = String(b.password);
      if (pwd.length < 6) return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalı" });
      user.passwordHash = hashPassword(pwd);
    }
    user.updatedAt = new Date().toISOString();
    await queueWriteUsersDb(db);
    res.json({ ok: true, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Güncellenemedi" });
  }
});

app.get("/api/account/orders", requireUser, async (req, res) => {
  try {
    const norm = await getAccountEmailForUserId(req.userId, req.authUser);
    if (!norm) return res.status(404).json({ error: "Hesap bulunamadı" });
    const orders = await readOrders();
    const mine = orders.filter(
      (o) => o.userId === req.userId || (!o.userId && normalizeEmail(o.customer?.email) === norm)
    );
    mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ orders: mine.map(orderForAccount) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Siparişler okunamadı" });
  }
});

app.get("/api/account/orders/:id", requireUser, async (req, res) => {
  try {
    const norm = await getAccountEmailForUserId(req.userId, req.authUser);
    if (!norm) return res.status(404).json({ error: "Hesap bulunamadı" });
    const orders = await readOrders();
    const order = orders.find((o) => o.id.toUpperCase() === String(req.params.id).toUpperCase());
    if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
    const owns =
      order.userId === req.userId || (!order.userId && normalizeEmail(order.customer?.email) === norm);
    if (!owns) return res.status(403).json({ error: "Bu sipariş size ait değil" });
    res.json({ order: orderForAccount(order) });
  } catch (e) {
    res.status(500).json({ error: "Okunamadı" });
  }
});

app.post("/api/analytics/ping", async (req, res) => {
  try {
    const { visitorId, path: pagePath } = req.body || {};
    await recordVisit(visitorId, pagePath, req.get("user-agent"));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "ping failed" });
  }
});

app.get("/api/orders/track", async (req, res) => {
  try {
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Sipariş numarası gerekli" });
    const orders = await readOrders();
    const order = orders.find((o) => o.id.toUpperCase() === id.toUpperCase());
    if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
    res.json({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      trackingCode: order.trackingCode || "",
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sorgu hatası" });
  }
});

app.post("/api/orders", requireUser, async (req, res) => {
  try {
    const userId = req.userId;
    const settings = await readSettings();
    const products = await readProducts();
    const productById = Object.fromEntries(products.map((p) => [p.id, p]));
    const { items, customer, note, paymentMethod } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Sepet boş" });
    }
    if (!customer || typeof customer !== "object") {
      return res.status(400).json({ error: "Müşteri bilgisi eksik" });
    }

    const name = String(customer.name || "").trim();
    const email = String(customer.email || "").trim();
    const phone = String(customer.phone || "").trim();
    const address = String(customer.address || "").trim();
    const city = String(customer.city || "").trim();
    if (!name || !email || !phone || !address) {
      return res.status(400).json({ error: "Ad, e-posta, telefon ve adres zorunludur" });
    }

    const accountEmail = await getAccountEmailForUserId(userId, req.authUser);
    if (accountEmail && normalizeEmail(email) !== accountEmail) {
      return res.status(400).json({ error: "Sipariş e-postası hesabınızdaki e-posta ile aynı olmalı" });
    }

    const pay = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : "kapida";

    const resolved = [];
    let subtotal = 0;
    for (const line of items) {
      const pid = line.productId;
      const qty = parseInt(line.quantity, 10);
      if (!pid || !Number.isFinite(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ error: "Geçersiz ürün satırı" });
      }
      const p = productById[pid];
      if (!p || !p.active) return res.status(400).json({ error: "Ürün mevcut değil: " + pid });
      if (p.stock < qty) return res.status(400).json({ error: `${p.name} için yeterli stok yok (max ${p.stock})` });
      const lineTotal = Math.round(p.price * qty * 100) / 100;
      subtotal += lineTotal;
      resolved.push({
        productId: pid,
        name: p.name,
        unit: p.unit,
        quantity: qty,
        unitPrice: p.price,
        lineTotal,
      });
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const shippingFee = calcShipping(subtotal, settings);
    const total = Math.round((subtotal + shippingFee) * 100) / 100;

    const order = {
      id:
        "KB-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        crypto.randomBytes(3).toString("hex").toUpperCase(),
      createdAt: new Date().toISOString(),
      status: "yeni",
      statusHistory: [{ status: "yeni", at: new Date().toISOString() }],
      customer: { name, email, phone, address, city },
      items: resolved,
      subtotal,
      shippingFee,
      total,
      paymentMethod: pay,
      note: note ? String(note).trim().slice(0, 2000) : "",
      trackingCode: "",
      adminNote: "",
      userId,
    };

    const allProducts = await readProducts();
    for (const line of resolved) {
      const p = allProducts.find((x) => x.id === line.productId);
      if (p) p.stock = Math.max(0, p.stock - line.quantity);
    }
    await queueWriteProducts(allProducts);

    const orders = await readOrders();
    orders.unshift(order);
    await queueWriteOrders(orders);
    res.status(201).json({ ok: true, orderId: order.id, total, shippingFee });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sipariş kaydedilemedi" });
  }
});

/* ——— Admin ——— */
app.post("/api/admin/upload", requireAdmin, (req, res) => {
  imageUpload.single("file")(req, res, async (err) => {
    if (err) {
      const msg = err.message || "Yükleme başarısız";
      return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "Dosya seçilmedi" });
    let url = `/uploads/${req.file.filename}`;
    if (supabaseServer.isSupabaseEnabled()) {
      const sbUrl = await supabaseServer.uploadToSupabaseStorage(
        req.file.path,
        req.file.filename,
        req.file.mimetype
      );
      if (sbUrl) url = sbUrl;
    }
    res.status(201).json({ ok: true, url });
  });
});

app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
  try {
    res.json(await readSettings());
  } catch (e) {
    res.status(500).json({ error: "Okunamadı" });
  }
});

app.patch("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    const cur = await readSettings();
    const b = req.body || {};
    const next = {
      ...cur,
      storeName: b.storeName != null ? String(b.storeName).slice(0, 80) : cur.storeName,
      tagline: b.tagline != null ? String(b.tagline).slice(0, 200) : cur.tagline,
      phone: b.phone != null ? String(b.phone).slice(0, 30) : cur.phone,
      email: b.email != null ? String(b.email).slice(0, 80) : cur.email,
      shippingFee: b.shippingFee != null ? Math.max(0, Number(b.shippingFee) || 0) : cur.shippingFee,
      freeShippingOver: b.freeShippingOver != null ? Math.max(0, Number(b.freeShippingOver) || 0) : cur.freeShippingOver,
      announcement: b.announcement != null ? String(b.announcement).slice(0, 300) : cur.announcement,
      address: b.address != null ? String(b.address).slice(0, 200) : cur.address,
      instagram: b.instagram != null ? String(b.instagram).slice(0, 80) : cur.instagram,
      whatsapp: b.whatsapp != null ? String(b.whatsapp).replace(/\D/g, "").slice(0, 15) : cur.whatsapp,
      about:
        b.about != null && typeof b.about === "object"
          ? normalizeAbout({ ...cur.about, ...b.about })
          : cur.about,
      navbar:
        b.navbar != null && typeof b.navbar === "object"
          ? normalizeNavbar({ ...cur.navbar, ...b.navbar })
          : cur.navbar,
    };
    await queueWriteSettings(next);
    res.json({ ok: true, settings: next });
  } catch (e) {
    res.status(500).json({ error: "Kaydedilemedi" });
  }
});

app.get("/api/admin/products", requireAdmin, async (_req, res) => {
  try {
    res.json(await readProducts());
  } catch (e) {
    res.status(500).json({ error: "Ürünler okunamadı" });
  }
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const list = await readProducts();
    const p = normalizeProduct(req.body || {});
    const ids = new Set(list.map((x) => x.id));
    if (ids.has(p.id)) p.id = uniqueId(p.id, ids);
    list.push(p);
    await queueWriteProducts(list);
    res.status(201).json({ ok: true, product: p });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Kaydedilemedi" });
  }
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const urlId = req.params.id;
    const list = await readProducts();
    const idx = list.findIndex((x) => x.id === urlId);
    if (idx === -1) return res.status(404).json({ error: "Ürün bulunamadı" });
    list[idx] = normalizeProduct(req.body || {}, urlId);
    await queueWriteProducts(list);
    res.json({ ok: true, product: list[idx] });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Güncellenemedi" });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const list = await readProducts();
    const next = list.filter((x) => x.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: "Ürün bulunamadı" });
    if (supabaseServer.isSupabaseEnabled()) {
      await supabaseServer.deleteProductFromDb(req.params.id);
    }
    await queueWriteProducts(next);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Silinemedi" });
  }
});

app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
  try {
    const [orders, products, reviews, analytics] = await Promise.all([
      readOrders(),
      readProducts(),
      readReviews(),
      readAnalytics(),
    ]);
    const newOrders = orders.filter((o) => o.status === "yeni").length;
    const revenue = orders
      .filter((o) => o.status !== "iptal")
      .reduce((s, o) => s + (Number(o.total) || Number(o.subtotal) || 0), 0);
    const lowStock = products.filter((p) => p.active && p.stock <= 5).length;
    const byStatus = {};
    for (const s of ORDER_STATUSES) byStatus[s] = orders.filter((o) => o.status === s).length;
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = orders.filter((o) => o.createdAt && o.createdAt.slice(0, 10) === key).length;
      last7.push({ date: key, count });
    }
    const pendingReviews = reviews.filter((r) => !r.approved).length;
    const reviewGlobal = reviewStats(reviews, true).global;
    const visitSummary = buildAnalyticsSummary(analytics);
    res.json({
      orderCount: orders.length,
      newOrders,
      productCount: products.filter((p) => p.active).length,
      revenue: Math.round(revenue * 100) / 100,
      lowStock,
      byStatus,
      chartLast7: last7,
      recentOrders: orders.slice(0, 10),
      pendingReviews,
      reviewCount: reviewGlobal.count,
      reviewAvg: reviewGlobal.avg,
      ...visitSummary,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Özet okunamadı" });
  }
});

app.get("/api/admin/analytics", requireAdmin, async (_req, res) => {
  try {
    const data = await readAnalytics();
    res.json(buildAnalyticsSummary(data));
  } catch (e) {
    res.status(500).json({ error: "Analitik okunamadı" });
  }
});

app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    let list = await readReviews();
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (status === "pending") list = list.filter((r) => !r.approved);
    else if (status === "approved") list = list.filter((r) => r.approved);
    const products = await readProducts();
    const nameById = Object.fromEntries(products.map((p) => [p.id, p.name]));
    res.json(
      list.map((r) => ({
        ...r,
        productName: nameById[r.productId] || r.productId,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "Yorumlar okunamadı" });
  }
});

app.patch("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
  try {
    const { approved } = req.body || {};
    const list = await readReviews();
    const idx = list.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Yorum bulunamadı" });
    if (approved === true) list[idx].approved = true;
    else if (approved === false) list[idx].approved = false;
    await queueWriteReviews(list);
    res.json({ ok: true, review: list[idx] });
  } catch (e) {
    res.status(500).json({ error: "Güncellenemedi" });
  }
});

app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
  try {
    const list = await readReviews();
    const next = list.filter((r) => r.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: "Yorum bulunamadı" });
    if (supabaseServer.isSupabaseEnabled()) {
      await supabaseServer.deleteReviewFromDb(req.params.id);
    }
    await queueWriteReviews(next);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Silinemedi" });
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    let orders = await readOrders();
    const status = String(req.query.status || "").trim();
    const q = String(req.query.q || "")
      .trim()
      .toLowerCase();
    if (status && status !== "all") orders = orders.filter((o) => o.status === status);
    if (q) {
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.includes(q) ||
          o.customer.email.toLowerCase().includes(q)
      );
    }
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: "Okuma hatası" });
  }
});

app.get("/api/admin/orders/export", requireAdmin, async (_req, res) => {
  try {
    const orders = await readOrders();
    const header = "id,tarih,durum,musteri,telefon,email,toplam,odeme\n";
    const rows = orders.map((o) => {
      const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
      return [
        esc(o.id),
        esc(o.createdAt),
        esc(o.status),
        esc(o.customer.name),
        esc(o.customer.phone),
        esc(o.customer.email),
        esc(o.total ?? o.subtotal),
        esc(o.paymentMethod),
      ].join(",");
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="siparisler.csv"');
    res.send("\uFEFF" + header + rows.join("\n"));
  } catch (e) {
    res.status(500).json({ error: "Dışa aktarılamadı" });
  }
});

app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminNote, trackingCode } = req.body || {};
    const orders = await readOrders();
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Sipariş bulunamadı" });
    const o = orders[idx];
    if (status && ORDER_STATUSES.includes(status) && status !== o.status) {
      o.status = status;
      o.statusHistory = o.statusHistory || [];
      o.statusHistory.push({ status, at: new Date().toISOString() });
    }
    if (adminNote !== undefined) o.adminNote = String(adminNote).slice(0, 2000);
    if (trackingCode !== undefined) o.trackingCode = String(trackingCode).slice(0, 80);
    o.updatedAt = new Date().toISOString();
    await queueWriteOrders(orders);
    res.json({ ok: true, order: o });
  } catch (e) {
    res.status(500).json({ error: "Güncellenemedi" });
  }
});

app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const orders = await readOrders();
    const next = orders.filter((o) => o.id !== req.params.id);
    if (next.length === orders.length) return res.status(404).json({ error: "Sipariş yok" });
    if (supabaseServer.isSupabaseEnabled()) {
      await supabaseServer.deleteOrderFromDb(req.params.id);
    }
    await queueWriteOrders(next);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Silinemedi" });
  }
});

app.get("/api/admin/finance", requireAdmin, async (req, res) => {
  try {
    const from = String(req.query.from || "").trim().slice(0, 10);
    const to = String(req.query.to || "").trim().slice(0, 10);
    const type = String(req.query.type || "").trim();
    let transactions = await readFinance();
    transactions.sort((a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
    if (from) transactions = transactions.filter((t) => t.date >= from);
    if (to) transactions = transactions.filter((t) => t.date <= to);
    if (FINANCE_TYPES.includes(type)) transactions = transactions.filter((t) => t.type === type);
    const summary = financeSummary(await readFinance(), from || null, to || null);
    res.json({ transactions, summary, categories: FINANCE_CATEGORIES });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Finans verisi okunamadı" });
  }
});

app.post("/api/admin/finance", requireAdmin, async (req, res) => {
  try {
    const tx = normalizeTransaction(req.body || {});
    if (!tx.amount) return res.status(400).json({ error: "Tutar 0 olamaz" });
    const list = await readFinance();
    list.unshift(tx);
    await queueWriteFinance(list);
    res.status(201).json({ ok: true, transaction: tx });
  } catch (e) {
    res.status(500).json({ error: "Kaydedilemedi" });
  }
});

app.patch("/api/admin/finance/:id", requireAdmin, async (req, res) => {
  try {
    const list = await readFinance();
    const idx = list.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Kayıt bulunamadı" });
    const merged = normalizeTransaction({ ...list[idx], ...req.body }, list[idx].id);
    merged.createdAt = list[idx].createdAt;
    if (!merged.amount) return res.status(400).json({ error: "Tutar 0 olamaz" });
    list[idx] = merged;
    await queueWriteFinance(list);
    res.json({ ok: true, transaction: merged });
  } catch (e) {
    res.status(500).json({ error: "Güncellenemedi" });
  }
});

app.delete("/api/admin/finance/:id", requireAdmin, async (req, res) => {
  try {
    const list = await readFinance();
    const next = list.filter((t) => t.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: "Kayıt bulunamadı" });
    if (supabaseServer.isSupabaseEnabled()) {
      await supabaseServer.deleteFinanceFromDb(req.params.id);
    }
    await queueWriteFinance(next);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Silinemedi" });
  }
});

app.post("/api/admin/finance/sync-orders", requireAdmin, async (req, res) => {
  try {
    const orders = await readOrders();
    const list = await readFinance();
    const linked = new Set(list.filter((t) => t.orderId).map((t) => t.orderId.toUpperCase()));
    let added = 0;
    for (const o of orders) {
      if (o.status !== "teslim_edildi" || linked.has(o.id.toUpperCase())) continue;
      const tx = normalizeTransaction({
        type: "income",
        category: "siparis",
        amount: o.total,
        description: `Sipariş ${o.id} — ${o.customer.name}`,
        date: (o.updatedAt || o.createdAt || "").slice(0, 10),
        orderId: o.id,
      });
      list.unshift(tx);
      linked.add(o.id.toUpperCase());
      added++;
    }
    if (added) await queueWriteFinance(list);
    res.json({ ok: true, added });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Senkronizasyon başarısız" });
  }
});

app.get("/api/admin/finance/export", requireAdmin, async (req, res) => {
  try {
    const transactions = await readFinance();
    const header = "id,tarih,tip,kategori,tutar,aciklama,siparis\n";
    const rows = transactions.map((t) => {
      const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
      return [esc(t.id), esc(t.date), esc(t.type), esc(t.category), esc(t.amount), esc(t.description), esc(t.orderId)].join(",");
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="gelir-gider.csv"');
    res.send("\uFEFF" + header + rows.join("\n"));
  } catch (e) {
    res.status(500).json({ error: "Dışa aktarılamadı" });
  }
});

async function sendHtmlWithApiBase(filename, req, res, next) {
  try {
    let file = filename;
    let filePath = path.join(ROOT, file);
    try {
      await fsp.access(filePath);
    } catch {
      if (filename === "index.html") {
        file = "mağza.html";
        filePath = path.join(ROOT, file);
      }
    }
    let html = await fsp.readFile(filePath, "utf8");
    const host = req.get("host") || `127.0.0.1:${PORT}`;
    const base = `${req.protocol}://${host}`;
    const inject = [];
    if (!html.includes("__KALE_API_BASE__")) {
      inject.push(`window.__KALE_API_BASE__=${JSON.stringify(base)}`);
    }
    const storefrontPages = new Set(["index.html", "takip.html", "hesap.html", "mağza.html"]);
    if (storefrontPages.has(filename)) {
      const settings = await readSettings();
      inject.push(`window.__KALE_SETTINGS__=${JSON.stringify(settings).replace(/</g, "\\u003c")}`);
    }
    if (supabaseServer.isSupabaseEnabled()) {
      const cfg = supabaseServer.getPublicConfig();
      inject.push(`window.__KALE_SUPABASE_URL__=${JSON.stringify(cfg.supabaseUrl)}`);
      inject.push(`window.__KALE_SUPABASE_ANON_KEY__=${JSON.stringify(cfg.supabaseAnonKey)}`);
    }
    if (inject.length) {
      html = html.replace("<head>", `<head>\n<script>${inject.join(";")};</script>`);
    }
    res.setHeader("Cache-Control", "no-cache");
    res.type("html").send(html);
  } catch (e) {
    next(e);
  }
}

app.get("/admin", (_req, res) => res.redirect(302, "/admin.html"));
app.get("/admin.html", (req, res, next) => sendHtmlWithApiBase("admin.html", req, res, next));
app.get("/", (req, res, next) => sendHtmlWithApiBase("index.html", req, res, next));
app.get("/index.html", (req, res, next) => sendHtmlWithApiBase("index.html", req, res, next));
app.get("/takip", (_req, res) => res.redirect(302, "/takip.html"));
app.get("/takip.html", (req, res, next) => sendHtmlWithApiBase("takip.html", req, res, next));
app.get("/hesap", (_req, res) => res.redirect(302, "/hesap.html"));
app.get("/hesap.html", (req, res, next) => sendHtmlWithApiBase("hesap.html", req, res, next));
app.get("/giris", (_req, res) => res.redirect(302, "/hesap.html?tab=giris"));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));
app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`Kale Biber: http://localhost:${PORT}`);
  console.log(`Yönetim:  http://localhost:${PORT}/admin`);
  if (supabaseServer.isSupabaseEnabled()) {
    console.log("Kimlik doğrulama: Supabase");
  } else {
    console.warn("Supabase kapalı — .env içine SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ekleyin (supabase/schema.sql çalıştırın).");
  }
});
