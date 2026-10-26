"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");
const AuthContext = createContext(null);

async function responsePayload(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.errors = payload.errors;
    throw error;
  }
  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState("loading");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/session`, { credentials: "include", cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          setUser(null);
          setStatus("ready");
          return;
        }
        const payload = await responsePayload(response);
        setUser(payload.data.user);
        setCsrfToken(payload.data.csrfToken);
        setStatus("ready");
      } catch (error) {
        if (error.name === "AbortError") return;
        setSessionError(error.message || "The authentication service could not be reached.");
        setStatus("error");
      }
    }
    loadSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      setUser(null);
      setCsrfToken("");
      setStatus("ready");
    }
    window.addEventListener("cpe:session-expired", handleExpiredSession);
    return () => window.removeEventListener("cpe:session-expired", handleExpiredSession);
  }, []);

  const authenticate = useCallback(async (mode, form) => {
    const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: "include", cache: "no-store" });
    const csrfPayload = await responsePayload(csrfResponse);
    const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfPayload.csrfToken },
      body: JSON.stringify(form),
    });
    const payload = await responsePayload(response);
    setUser(payload.data.user);
    setCsrfToken(payload.data.csrfToken);
    setSessionError("");
    setStatus("ready");
    return payload.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrfToken },
      });
      await responsePayload(response);
    } finally {
      setUser(null);
      setCsrfToken("");
      setStatus("ready");
    }
  }, [csrfToken]);

  const value = useMemo(() => ({ user, status, sessionError, authenticate, logout }), [user, status, sessionError, authenticate, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
