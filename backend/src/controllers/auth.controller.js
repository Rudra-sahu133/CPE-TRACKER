import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import { createPreAuthCsrfToken, createSessionCsrfToken, createSessionToken, hashToken } from "../utils/auth-tokens.js";
import { SESSION_COOKIE_NAME } from "../middleware/auth.middleware.js";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export function getCsrf(_request, response, next) {
  try { return response.status(200).json({ status: "ok", csrfToken: createPreAuthCsrfToken() }); }
  catch (error) { return next(error); }
}

export async function register(request, response, next) {
  const { name, email, password } = request.validatedRegistration;
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, passwordHash });
    return await startSession(user, response, 201);
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = new Error("An account with this email already exists.");
      duplicate.status = 409;
      duplicate.details = { email: "This email address is already registered." };
      return next(duplicate);
    }
    return next(serviceError());
  }
}

export async function login(request, response, next) {
  const { email, password } = request.validatedLogin;
  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, await bcrypt.hash("invalid-account-password", BCRYPT_ROUNDS));
    if (!user || !passwordMatches) {
      const error = new Error("Email or password is incorrect.");
      error.status = 401;
      return next(error);
    }
    return await startSession(user, response);
  } catch {
    return next(serviceError());
  }
}

export async function getCurrentSession(request, response, next) {
  try {
    response.cookie(SESSION_COOKIE_NAME, request.authToken, cookieOptions(request.authSession.expiresAt));
    clearLegacySessionCookie(response);
    return response.status(200).json({
      status: "ok",
      data: { user: request.authUser, csrfToken: createSessionCsrfToken(request.authToken) },
    });
  } catch (error) { return next(error); }
}

export async function logout(request, response, next) {
  try {
    await Session.deleteOne({ _id: request.authSession._id });
    clearSessionCookie(response);
    clearLegacySessionCookie(response);
    return response.status(200).json({ status: "ok", message: "You have been signed out." });
  } catch { return next(serviceError("Sign-out could not be completed. Please try again.")); }
}

async function startSession(user, response, statusCode = 200) {
  const token = createSessionToken();
  const csrfToken = createSessionCsrfToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  try {
    await Session.create({ userId: user._id, tokenHash: hashToken(token), expiresAt });
  } catch {
    throw serviceError("Your account could not be signed in. Please try again.");
  }
  clearLegacySessionCookie(response);
  response.cookie(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
  return response.status(statusCode).json({
    status: "ok",
    data: {
      user: { id: user._id.toString(), name: user.name, email: user.email },
      csrfToken,
    },
  });
}

function cookieOptions(expiresAt) {
  const configuredSameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  const sameSite = ["strict", "lax", "none"].includes(configuredSameSite) ? configuredSameSite : "lax";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    // Business APIs live under /api too and must receive the session cookie.
    path: "/api",
    expires: expiresAt,
  };
}

function clearSessionCookie(response) {
  response.clearCookie(SESSION_COOKIE_NAME, { ...cookieOptions(new Date(0)), expires: new Date(0), maxAge: 0 });
}

function clearLegacySessionCookie(response) {
  response.clearCookie(SESSION_COOKIE_NAME, {
    ...cookieOptions(new Date(0)),
    path: "/api/auth",
    expires: new Date(0),
    maxAge: 0,
  });
}

function serviceError(message = "Authentication service is temporarily unavailable.") {
  const error = new Error(message);
  error.status = 503;
  return error;
}
