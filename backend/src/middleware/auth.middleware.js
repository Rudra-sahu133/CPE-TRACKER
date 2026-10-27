import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import { hashToken, verifyPreAuthCsrfToken, verifySessionCsrfToken } from "../utils/auth-tokens.js";

export const SESSION_COOKIE_NAME = "cpe_session";

export function getSessionToken(request) {
  const cookies = request.headers.cookie || "";
  const entry = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice(SESSION_COOKIE_NAME.length + 1)); } catch { return null; }
}

export async function requireSession(request, _response, next) {
  try {
    const token = getSessionToken(request);
    if (!token || token.length > 256) return next(unauthorized());
    const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).select("+tokenHash");
    if (!session) return next(unauthorized());
    const user = await User.findById(session.userId).select("name email role").lean();
    if (!user) return next(unauthorized());
    request.authSession = session;
    request.authToken = token;
    request.authUser = { id: user._id.toString(), name: user.name, email: user.email, role: user.role || "user" };
    return next();
  } catch {
    const error = new Error("Session could not be verified. Please try again.");
    error.status = 503;
    return next(error);
  }
}

export function requirePreAuthCsrf(request, _response, next) {
  if (request.get("content-type")?.toLowerCase().startsWith("application/json")
    && verifyPreAuthCsrfToken(request.get("x-csrf-token"))) return next();
  const error = new Error("CSRF validation failed. Refresh and try again.");
  error.status = 403;
  return next(error);
}

export function requireSessionCsrf(request, _response, next) {
  if (verifySessionCsrfToken(request.authToken, request.get("x-csrf-token"))) return next();
  const error = new Error("CSRF validation failed. Refresh and try again.");
  error.status = 403;
  return next(error);
}

export function requireRole(...roles) {
  return function authorizeRole(request, _response, next) {
    if (request.authUser && roles.includes(request.authUser.role)) return next();
    const error = new Error("You do not have permission to perform this action.");
    error.status = request.authUser ? 403 : 401;
    return next(error);
  };
}

function unauthorized() {
  const error = new Error("Your session is invalid or has expired. Please sign in again.");
  error.status = 401;
  return error;
}
