import Professional from "../models/professional.model.js";
import { serializeProfessional } from "../utils/professional-status.js";

function safeServiceError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

export async function listProfessionals(request, response, next) {
  try {
    const professionals = await Professional.find({ owner: request.authUser.id }).sort({ createdAt: -1, _id: -1 }).lean();
    return response.status(200).json({
      status: "ok",
      data: professionals.map((professional) => serializeProfessional(professional)),
    });
  } catch {
    return next(safeServiceError("Professionals could not be loaded. Please try again."));
  }
}

export async function createProfessional(request, response, next) {
  const { email } = request.validatedProfessional;
  const owner = request.authUser.id;

  try {
    const existingProfessional = await Professional.exists({ owner, email });
    if (existingProfessional) {
      const error = new Error("A professional with this email already exists.");
      error.status = 409;
      error.details = { email: "This email is already in the professional list." };
      return next(error);
    }

    const professional = await Professional.create({ ...request.validatedProfessional, owner });
    return response.status(201).json({
      status: "ok",
      data: serializeProfessional(professional),
      message: "Professional added successfully.",
    });
  } catch (cause) {
    if (cause.code === 11000 && (cause.keyPattern?.email || cause.keyPattern?.owner || cause.keyValue?.email)) {
      const error = new Error("A professional with this email already exists.");
      error.status = 409;
      error.details = { email: "This email is already in the professional list." };
      return next(error);
    }

    return next(safeServiceError("Professional could not be saved. Please try again."));
  }
}

