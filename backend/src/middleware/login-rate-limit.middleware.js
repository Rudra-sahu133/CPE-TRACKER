const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attemptsByAddress = new Map();

export function loginRateLimit(request, response, next) {
  const now = Date.now();
  const address = request.ip || request.socket.remoteAddress || "unknown";
  let entry = attemptsByAddress.get(address);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    attemptsByAddress.set(address, entry);
  }

  if (entry.count >= MAX_ATTEMPTS) {
    response.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return response.status(429).json({ status: "error", message: "Too many sign-in attempts. Please wait and try again." });
  }

  entry.count += 1;
  return next();
}
