const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");
let sessionCheckPromise;

async function confirmSessionExpired() {
  if (!sessionCheckPromise) {
    sessionCheckPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/session`, {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401 && typeof window !== "undefined") {
          window.dispatchEvent(new Event("cpe:session-expired"));
        }
      } catch {
        // A network or server failure does not establish that the session expired.
      } finally {
        sessionCheckPromise = undefined;
      }
    })();
  }
  return sessionCheckPromise;
}

export async function apiFetch(url, options = {}, csrfToken = "") {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(url, { ...options, headers, credentials: "include" });
  if (response.status === 401 && typeof window !== "undefined") await confirmSessionExpired();
  return response;
}
