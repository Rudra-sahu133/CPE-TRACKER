import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: ["admin.bootstrap", "user.role_changed"], required: true },
  details: {
    previousRole: { type: String, enum: ["user", "operations", "admin"] },
    newRole: { type: String, enum: ["user", "operations", "admin"] },
  },
}, { timestamps: true, versionKey: false });

auditLogSchema.index({ createdAt: -1, _id: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
