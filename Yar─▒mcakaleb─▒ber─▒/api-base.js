/**
 * API kök adresi: sayfa Live Server / Vite vb. ile açıldıysa Node (varsayılan 3000) kullanılır.
 * Farklı port: <meta name="kale-api-base" content="http://127.0.0.1:PORT" />
 */
const STATIC_ONLY_PORTS = new Set(["5500", "5501", "5502", "5173", "4173", "8000"]);

export function getApiBase() {
  if (typeof window !== "undefined" && window.__KALE_API_BASE__) {
    return String(window.__KALE_API_BASE__).replace(/\/$/, "");
  }

  const meta = document.querySelector('meta[name="kale-api-base"]');
  const fromMeta = meta?.getAttribute("content")?.trim();
  if (fromMeta) return fromMeta.replace(/\/$/, "");

  if (typeof window === "undefined") return "";
  if (window.location.protocol === "file:") {
    return "http://127.0.0.1:3000";
  }

  const host = window.location.hostname;
  const port = window.location.port || "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal) return "";

  if (STATIC_ONLY_PORTS.has(port)) {
    return "http://127.0.0.1:3000";
  }

  return "";
}

export function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
