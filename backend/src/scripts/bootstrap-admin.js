import "dotenv/config";
import mongoose from "mongoose";
import AdminBootstrapState from "../models/admin-bootstrap-state.model.js";
import AuditLog from "../models/audit-log.model.js";
import { closeDatabaseConnection, connectToDatabase } from "../config/database.js";
import User from "../models/user.model.js";

const email = process.argv[2]?.trim().toLowerCase();

async function bootstrapAdmin() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Provide the email of an existing account: npm run admin:bootstrap -- user@example.com");
  }

  await connectToDatabase();
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      if (await AdminBootstrapState.findById("first-admin").session(transaction)) {
        throw new Error("Administrator bootstrap has already been used.");
      }
      if (await User.exists({ role: "admin" }).session(transaction)) {
        throw new Error("An administrator already exists; bootstrap is disabled.");
      }

      const user = await User.findOne({ email }).session(transaction);
      if (!user) throw new Error("No account with that email exists. Create the account first, then retry.");
      if (user.role === "admin") throw new Error("That account is already an administrator.");

      const previousRole = user.role || "user";
      user.role = "admin";
      await user.save({ session: transaction });
      await AuditLog.create([{
        actor: user._id,
        targetUser: user._id,
        action: "admin.bootstrap",
        details: { previousRole, newRole: "admin" },
      }], { session: transaction });
      await AdminBootstrapState.create([{
        _id: "first-admin",
        administrator: user._id,
        completedAt: new Date(),
      }], { session: transaction });
    });
    console.log("First administrator bootstrapped successfully. Sign in with the existing account.");
  } finally {
    await transaction.endSession();
  }
}

try {
  await bootstrapAdmin();
} catch (error) {
  const safeMessages = new Set([
    "Provide the email of an existing account: npm run admin:bootstrap -- user@example.com",
    "An administrator already exists; bootstrap is disabled.",
    "Administrator bootstrap has already been used.",
    "No account with that email exists. Create the account first, then retry.",
    "That account is already an administrator.",
  ]);
  console.error(safeMessages.has(error.message)
    ? error.message
    : "Administrator bootstrap failed. Check backend database configuration and connectivity.");
  process.exitCode = 1;
} finally {
  await closeDatabaseConnection().catch(() => {});
}
