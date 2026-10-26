const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(request, _response, next) {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return next(badRequest("A JSON object is required."));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) errors.password = "Password must be at least 12 characters and no more than 72 UTF-8 bytes.";
  if (Object.keys(errors).length) {
    const error = badRequest("Please correct the highlighted fields.");
    error.details = errors;
    return next(error);
  }
  request.validatedRegistration = { name, email, password };
  return next();
}

export function validateLogin(request, _response, next) {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return next(badRequest("A JSON object is required."));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email) || password.length === 0 || Buffer.byteLength(password, "utf8") > 72) {
    return next(badRequest("Enter a valid email address and password."));
  }
  request.validatedLogin = { email, password };
  return next();
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}
