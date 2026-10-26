import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function secret() {
  const value = process.env.AUTH_CSRF_SECRET;
  if (!value || value.length < 32) {
    const error = new Error("Authentication is not configured. Set AUTH_CSRF_SECRET to at least 32 characters.");
    error.status = 503;
    throw error;
  }
  return value;
}

function signature(value) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(left || "", "utf8");
  const b = Buffer.from(right || "", "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function createSessionCsrfToken(sessionToken) {
  return signature(`session|${sessionToken}`);
}

export function verifySessionCsrfToken(sessionToken, supplied) {
  return safeEqual(createSessionCsrfToken(sessionToken), supplied);
}

export function createPreAuthCsrfToken() {
  const nonce = randomBytes(24).toString("hex");
  const expires = Date.now() + 10 * 60 * 1000;
  const payload = `${nonce}.${expires}`;
  return `${payload}.${signature(`preauth|${payload}`)}`;
}

export function verifyPreAuthCsrfToken(supplied) {
  if (typeof supplied !== "string") return false;
  const [nonce, expiresText, suppliedSignature, extra] = supplied.split(".");
  if (!nonce || !expiresText || !suppliedSignature || extra) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires < Date.now() || expires > Date.now() + 10 * 60 * 1000) return false;
  try {
    return safeEqual(signature(`preauth|${nonce}.${expiresText}`), suppliedSignature);
  } catch {
    return false;
  }
}
