import { Router } from "express";
import { changeUserRole, getAdminOverview, listAdminAuditLogs, listUsers } from "../controllers/admin.controller.js";
import { requireRole, requireSession, requireSessionCsrf } from "../middleware/auth.middleware.js";

const adminRouter = Router();
adminRouter.use(requireSession);
adminRouter.get("/overview", requireRole("admin", "operations"), getAdminOverview);
adminRouter.get("/users", requireRole("admin"), listUsers);
adminRouter.patch("/users/:userId/role", requireRole("admin"), requireSessionCsrf, changeUserRole);
adminRouter.get("/audit-logs", requireRole("admin"), listAdminAuditLogs);

export default adminRouter;
