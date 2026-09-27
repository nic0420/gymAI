"use client";

/**
 * Cliente HTTP del frontend.
 *
 * FIX: el login devolvía un accessToken que el frontend descartaba; ninguna llamada enviaba
 * credenciales (y el backend tampoco las pedía). Ahora todas las llamadas a la API pasan por
 * `apiFetch`, que adjunta `Authorization: Bearer <token>` y renueva el token automáticamente
 * con la cookie HttpOnly de refresh cuando expira (15 min).
 *
 * El access token vive sólo en memoria (no en localStorage) para reducir el impacto de XSS.
 */

export interface SessionUser {
  id: string;
  dni: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  branches?: { id: string; name: string }[];
  settings?: any;
}

export interface SessionData {
  accessToken: string;
  user: SessionUser;
  tenant: SessionTenant;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<SessionData | null> | null = null;
const expiredListeners = new Set<() => void>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

/** Renueva la sesión usando la cookie HttpOnly de refresh. Devuelve null si no hay sesión. */
export function refreshSession(): Promise<SessionData | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "same-origin" });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json?.success || !json.data?.accessToken) return null;
        accessToken = json.data.accessToken;
        return json.data as SessionData;
      } catch {
        return null;
      } finally {
        // Liberar el candado en el próximo tick para que llamadas concurrentes compartan resultado
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    accessToken = null;
  }
}

/** fetch() autenticado con reintento transparente tras renovar el token. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () => {
    const headers = new Headers(init.headers || {});
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers, credentials: "same-origin" });
  };

  let res = await doFetch();
  if (res.status === 401 && !input.startsWith("/api/v1/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch();
    } else {
      accessToken = null;
      expiredListeners.forEach((l) => l());
    }
  }
  return res;
}
