import { PROFESSIONAL_STATES } from "../models/professional.model.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateProfessional(request, _response, next) {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("A JSON object is required.");
    error.status = 400;
    return next(error);
  }

  if (["owner", "ownerId", "userId", "createdBy"].some((field) => Object.hasOwn(body, field))) {
    const error = new Error("Record ownership is assigned from your signed-in session.");
    error.status = 400;
    error.details = { owner: "Do not include ownership fields." };
    return next(error);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const profession = body.profession;
  const state = body.state;
  const licenseExpiry = body.licenseExpiry;
  const errors = {};

  if (!name) errors.name = "Name is required.";
  else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";

  if (!email) errors.email = "Email is required.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!["CPA", "Attorney"].includes(profession)) errors.profession = "Profession must be CPA or Attorney.";
  if (!PROFESSIONAL_STATES.includes(state)) errors.state = "Choose a valid U.S. state or District of Columbia.";
  if (typeof licenseExpiry !== "string" || !isRealDate(licenseExpiry)) {
    errors.licenseExpiry = "Enter a valid license expiry date in YYYY-MM-DD format.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error("Please correct the highlighted fields.");
    error.status = 400;
    error.details = errors;
    return next(error);
  }

  request.validatedProfessional = { name, email, profession, state, licenseExpiry: new Date(`${licenseExpiry}T00:00:00.000Z`) };
  return next();
}
