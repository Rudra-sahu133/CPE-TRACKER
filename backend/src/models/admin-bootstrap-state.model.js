import mongoose from "mongoose";

const adminBootstrapStateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  administrator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completedAt: { type: Date, required: true },
}, { versionKey: false, collection: "adminBootstrapState" });

const AdminBootstrapState = mongoose.models.AdminBootstrapState
  || mongoose.model("AdminBootstrapState", adminBootstrapStateSchema);

export default AdminBootstrapState;
