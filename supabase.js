/* ============================================================
   EL CLUB DE LA GENTE — Supabase client
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = "https://egwaedadpqfwnbfosiao.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4";

/* ---------- Respaldo de sesión en cookie ----------
   iOS puede borrar el localStorage de una web "agregada a pantalla de
   inicio" cuando se quita del multitarea, aunque nunca se haya cerrado
   sesión -- eso fuerza a pedir el código de WhatsApp de nuevo cada vez,
   gastando cuota del Agente. Este storage guarda la sesión en
   localStorage (como siempre) Y en una cookie de un año como respaldo;
   si localStorage aparece vacío al arrancar, se restaura desde la
   cookie antes de que Supabase la lea. Se parte en varias cookies
   porque una sesión completa (tokens + datos del usuario) puede
   superar el límite de ~4KB de una sola cookie. */
const COOKIE_CHUNK = 3500;
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function setCookieRaw(name, value) {
  const unAnio = 365 * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${unAnio}; path=/; SameSite=Lax; Secure`;
}
function getCookieRaw(name) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + escRe(name) + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function expireCookie(name) {
  document.cookie = `${name}=; max-age=0; path=/`;
}
function setCookieChunked(key, value) {
  removeCookieChunked(key);
  const partes = [];
  for (let i = 0; i < value.length; i += COOKIE_CHUNK) partes.push(value.slice(i, i + COOKIE_CHUNK));
  partes.forEach((p, i) => setCookieRaw(`${key}.c${i}`, p));
  setCookieRaw(`${key}.n`, String(partes.length));
}
function getCookieChunked(key) {
  const n = getCookieRaw(`${key}.n`);
  if (!n) return null;
  let value = "";
  for (let i = 0; i < Number(n); i++) {
    const parte = getCookieRaw(`${key}.c${i}`);
    if (parte == null) return null;
    value += parte;
  }
  return value;
}
function removeCookieChunked(key) {
  const n = getCookieRaw(`${key}.n`);
  const total = n ? Number(n) : 8;
  for (let i = 0; i < Math.max(total, 8); i++) expireCookie(`${key}.c${i}`);
  expireCookie(`${key}.n`);
}

const storageConRespaldo = {
  getItem(key) {
    try {
      const enLocal = window.localStorage.getItem(key);
      if (enLocal) return enLocal;
    } catch {}
    try {
      const enCookie = getCookieChunked(key);
      if (enCookie) {
        try { window.localStorage.setItem(key, enCookie); } catch {}
        return enCookie;
      }
    } catch {}
    return null;
  },
  setItem(key, value) {
    try { window.localStorage.setItem(key, value); } catch {}
    try { setCookieChunked(key, value); } catch {}
  },
  removeItem(key) {
    try { window.localStorage.removeItem(key); } catch {}
    try { removeCookieChunked(key); } catch {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: storageConRespaldo, persistSession: true, autoRefreshToken: true },
});
