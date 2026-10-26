import { Router } from "express";
import { getCsrf, getCurrentSession, login, logout, register } from "../controllers/auth.controller.js";
import { loginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { requirePreAuthCsrf, requireSession, requireSessionCsrf } from "../middleware/auth.middleware.js";
import { validateLogin, validateRegistration } from "../middleware/validate-auth.middleware.js";

const authRouter = Router();

authRouter.get("/csrf", getCsrf);
authRouter.post("/register", requirePreAuthCsrf, validateRegistration, register);
authRouter.post("/login", requirePreAuthCsrf, validateLogin, loginRateLimit, login);
authRouter.get("/session", requireSession, getCurrentSession);
authRouter.post("/logout", requireSession, requireSessionCsrf, logout);

export default authRouter;
