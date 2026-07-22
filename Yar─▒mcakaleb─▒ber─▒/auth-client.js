/** Müşteri oturumu — Supabase veya yerel JSON (yedek) */
import { apiUrl } from "./api-base.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

export const AUTH_TOKEN_KEY = "kale-auth-token-v1";

let cachedAccessToken = "";

function legacyGetToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function legacySetToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function resolveAccessToken() {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseClient();
    if (!sb) return "";
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token || "";
    cachedAccessToken = token;
    return token;
  }
  return legacyGetToken();
}

export function getToken() {
  return cachedAccessToken || legacyGetToken();
}

export function setToken(token) {
  if (!isSupabaseConfigured()) legacySetToken(token);
  else cachedAccessToken = token || "";
}

export async function authHeaders(extra = {}) {
  const token = (await resolveAccessToken()).trim();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function authFetch(path, opts = {}) {
  const headers = { ...(await authHeaders()), ...(opts.headers || {}) };
  if (opts.body instanceof FormData) delete headers["Content-Type"];
  let res;
  try {
    res = await fetch(apiUrl(path), { ...opts, headers });
  } catch {
    throw new Error("Sunucuya bağlanılamadı. npm start çalışıyor olmalı.");
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Yanıt okunamadı" };
  }
  if (res.status === 401) {
    setToken("");
    if (isSupabaseConfigured()) {
      await getSupabaseClient()?.auth.signOut();
    }
    throw new Error(data.error || "Oturum süresi doldu. Tekrar giriş yapın.");
  }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function ensureSupabaseConfig() {
  if (isSupabaseConfigured()) return;
  try {
    const res = await fetch(apiUrl("/api/config"));
    if (!res.ok) return;
    const cfg = await res.json();
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      window.__KALE_SUPABASE_URL__ = cfg.supabaseUrl;
      window.__KALE_SUPABASE_ANON_KEY__ = cfg.supabaseAnonKey;
    }
  } catch {
    /* ignore */
  }
}

export async function initAuth() {
  await ensureSupabaseConfig();
  if (!isSupabaseConfigured()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  cachedAccessToken = data.session?.access_token || "";
  sb.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token || "";
  });
}

export async function getMe() {
  if (isSupabaseConfigured()) {
    await initAuth();
    const token = await resolveAccessToken();
    if (!token) return null;
    try {
      const data = await authFetch("/api/auth/me");
      return data.user || null;
    } catch {
      setToken("");
      return null;
    }
  }
  const token = legacyGetToken();
  if (!token) return null;
  try {
    const data = await authFetch("/api/auth/me");
    return data.user || null;
  } catch {
    legacySetToken("");
    return null;
  }
}

export async function login(email, password) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    });
    if (error) throw new Error(error.message === "Invalid login credentials" ? "E-posta veya şifre hatalı" : error.message);
    cachedAccessToken = data.session?.access_token || "";
    try {
      const profile = await authFetch("/api/auth/me");
      return profile.user;
    } catch {
      const u = data.user;
      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || "",
        phone: u.user_metadata?.phone || "",
        address: "",
        city: "",
      };
    }
  }
  const data = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) legacySetToken(data.token);
  return data.user;
}

export async function register(body) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseClient();
    const { data, error } = await sb.auth.signUp({
      email: String(body.email).trim(),
      password: String(body.password),
      options: {
        data: {
          name: String(body.name || "").trim(),
          phone: String(body.phone || "").trim(),
        },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error(
        "Kayıt oluşturuldu. E-posta onayı gerekiyorsa gelen kutunuzu kontrol edin; ardından giriş yapın. (Supabase → Authentication → Providers → Email → Confirm email kapalı olabilir.)"
      );
    }
    cachedAccessToken = data.session.access_token;
    try {
      await authFetch("/api/auth/profile-sync", {
        method: "POST",
        body: JSON.stringify({
          name: body.name,
          phone: body.phone,
          address: body.address,
          city: body.city,
        }),
      });
    } catch {
      /* profil tetikleyici ile de oluşabilir */
    }
    const me = await authFetch("/api/auth/me");
    return me.user;
  }
  const data = await authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (data.token) legacySetToken(data.token);
  return data.user;
}

export async function logout() {
  if (isSupabaseConfigured()) {
    await getSupabaseClient()?.auth.signOut();
    cachedAccessToken = "";
    return;
  }
  const token = legacyGetToken();
  if (token) {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
  }
  legacySetToken("");
}

export async function updateProfile(body) {
  const data = await authFetch("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return data.user;
}

export async function fetchMyOrders() {
  const data = await authFetch("/api/account/orders");
  return data.orders || [];
}

export function updateHeaderAccountLink(user) {
  const link = document.getElementById("header-account-link");
  if (!link) return;
  if (user) {
    link.textContent = "Hesabım";
    link.href = "/hesap.html";
    link.title = user.name || user.email || "";
  } else {
    link.textContent = "Giriş";
    link.href = "/hesap.html";
    link.removeAttribute("title");
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}
