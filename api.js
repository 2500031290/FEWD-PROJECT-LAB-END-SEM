// Set VITE_API_URL when the API is hosted elsewhere; in dev the Vite proxy handles "/api".
const BASE = import.meta.env.VITE_API_URL ?? "";
const KEY = "auth.tokens";

export const tokens = {
  get: () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set: (t) => localStorage.setItem(KEY, JSON.stringify(t)),
  clear: () => localStorage.removeItem(KEY),
};

async function raw(path, { method = "GET", body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { status: res.status });
  return data;
}

// Authenticated request: refreshes the access token once if it has expired.
export async function api(path, opts = {}) {
  let t = tokens.get();
  try {
    return await raw(path, { ...opts, token: t?.accessToken });
  } catch (err) {
    if (err.status !== 401 || !t?.refreshToken) throw err;
    const fresh = await raw("/api/auth/refresh", { method: "POST", body: { refreshToken: t.refreshToken } });
    tokens.set({ accessToken: fresh.accessToken, refreshToken: fresh.refreshToken });
    return raw(path, { ...opts, token: fresh.accessToken });
  }
}

export const authRequest = (path, body) => raw(path, { method: "POST", body });
