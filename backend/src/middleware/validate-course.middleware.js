const PROFESSIONS = ["CPA", "Attorney", "Both"];

export function validateCourse(request, _response, next) {
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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const profession = body.profession;
  const credits = body.credits;
  const errors = {};

  if (!title) errors.title = "Course name is required.";
  else if (title.length > 180) errors.title = "Course name must be 180 characters or fewer.";

  if (!provider) errors.provider = "Provider is required.";
  else if (provider.length > 120) errors.provider = "Provider must be 120 characters or fewer.";

  if (!PROFESSIONS.includes(profession)) errors.profession = "Choose CPA, Attorney, or Both.";

  if (typeof credits !== "number" || !Number.isFinite(credits) || credits <= 0 || credits > 200) {
    errors.credits = "Credits must be a number greater than 0 and no more than 200.";
  } else if (Math.round(credits * 100) !== credits * 100) {
    errors.credits = "Credits may have no more than two decimal places.";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error("Please correct the highlighted fields.");
    error.status = 400;
    error.details = errors;
    return next(error);
  }

  request.validatedCourse = { title, provider, profession, credits };
  return next();
}
