import mongoose from "mongoose";
import AuditLog from "../models/audit-log.model.js";
import Course from "../models/course.model.js";
import Professional from "../models/professional.model.js";
import User from "../models/user.model.js";

const MAX_PAGE_SIZE = 100;
const ROLE_VALUES = ["user", "operations", "admin"];

function badRequest(message, details) {
  const error = new Error(message);
  error.status = 400;
  if (details) error.details = details;
  return error;
}

function serviceUnavailable(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function pagination(query) {
  const pageText = query.page || "1";
  const limitText = query.limit || "20";
  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) {
    throw badRequest(`Page must be positive and limit must be between 1 and ${MAX_PAGE_SIZE}.`);
  }
  const page = Number(pageText);
  const limit = Number(limitText);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE || !Number.isSafeInteger((page - 1) * limit)) {
    throw badRequest(`Page must be positive and limit must be between 1 and ${MAX_PAGE_SIZE}.`);
  }
  return { page, limit, skip: (page - 1) * limit };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role || "user",
    createdAt: user.createdAt,
  };
}

export async function getAdminOverview(_request, response, next) {
  try {
    const [users, professionals, courses] = await Promise.all([
      User.countDocuments({}),
      Professional.countDocuments({ owner: { $type: "objectId" } }),
      Course.countDocuments({ owner: { $type: "objectId" } }),
    ]);
    return response.status(200).json({ status: "ok", data: { users, professionals, courses } });
  } catch {
    return next(serviceUnavailable("Operational metrics could not be loaded. Please try again."));
  }
}

export async function listUsers(request, response, next) {
  try {
    const { page, limit, skip } = pagination(request.query);
    const search = typeof request.query.search === "string" ? request.query.search.trim().slice(0, 100) : "";
    const role = typeof request.query.role === "string" ? request.query.role : "";
    if (role && !ROLE_VALUES.includes(role)) throw badRequest("Choose a valid user role.");

    const filter = {};
    if (role === "user") filter.$or = [{ role: "user" }, { role: { $exists: false } }];
    else if (role) filter.role = role;
    if (search) {
      const searchFilter = { $or: [
        { name: { $regex: escapeRegExp(search), $options: "i" } },
        { email: { $regex: escapeRegExp(search), $options: "i" } },
      ] };
      if (filter.$or) filter.$and = [{ $or: filter.$or }, searchFilter];
      else Object.assign(filter, searchFilter);
      delete filter.$or;
    }

    const [users, total] = await Promise.all([
      User.find(filter).select("name email role createdAt").sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return response.status(200).json({
      status: "ok",
      data: users.map(serializeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error.status === 400) return next(error);
    return next(serviceUnavailable("Users could not be loaded. Please try again."));
  }
}

export async function changeUserRole(request, response, next) {
  const { userId } = request.params;
  const { role } = request.body || {};
  if (!mongoose.isObjectIdOrHexString(userId)) return next(badRequest("A valid user ID is required."));
  if (request.authUser.id.toLowerCase() === userId.toLowerCase()) return next(badRequest("You cannot change your own role."));
  if (role !== "user" && role !== "operations") {
    return next(badRequest("Role must be either user or operations. Administrator access is granted only through the bootstrap command."));
  }

  const transaction = await mongoose.startSession();
  let updatedUser;
  try {
    await transaction.withTransaction(async () => {
      const target = await User.findById(userId).session(transaction).select("name email role").lean();
      if (!target) {
        const error = new Error("User was not found.");
        error.status = 404;
        throw error;
      }
      const previousRole = target.role || "user";
      if (previousRole === "admin") {
        throw badRequest("Administrator roles cannot be changed through user management.");
      }
      if (previousRole === role) {
        updatedUser = target;
        return;
      }

      const roleFilter = target.role ? { role: target.role } : { role: { $exists: false } };
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, ...roleFilter },
        { $set: { role } },
        { new: true, runValidators: true, session: transaction },
      ).select("name email role createdAt").lean();
      if (!updatedUser) {
        const error = new Error("User role changed concurrently. Refresh and try again.");
        error.status = 409;
        throw error;
      }

      await AuditLog.create([{
        actor: request.authUser.id,
        targetUser: userId,
        action: "user.role_changed",
        details: { previousRole, newRole: role },
      }], { session: transaction });
    });
    return response.status(200).json({ status: "ok", data: serializeUser(updatedUser), message: "User role updated." });
  } catch (error) {
    if (error.status) return next(error);
    return next(serviceUnavailable("User role could not be updated. Please try again."));
  } finally {
    await transaction.endSession();
  }
}

export async function listAdminAuditLogs(request, response, next) {
  try {
    const { page, limit, skip } = pagination(request.query);
    const action = typeof request.query.action === "string" ? request.query.action : "";
    if (action && !["admin.bootstrap", "user.role_changed"].includes(action)) throw badRequest("Choose a valid activity type.");
    const filter = action ? { action } : {};
    const [entries, total] = await Promise.all([
      AuditLog.find(filter).populate("actor", "name email").populate("targetUser", "name email").sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    const data = entries.map((entry) => ({
      id: entry._id.toString(),
      action: entry.action,
      actor: entry.actor ? { name: entry.actor.name, email: entry.actor.email } : null,
      targetUser: entry.targetUser ? { name: entry.targetUser.name, email: entry.targetUser.email } : null,
      details: entry.details,
      createdAt: entry.createdAt,
    }));
    return response.status(200).json({ status: "ok", data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    if (error.status === 400) return next(error);
    return next(serviceUnavailable("Administrative activity could not be loaded. Please try again."));
  }
}
