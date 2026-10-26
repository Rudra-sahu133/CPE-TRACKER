import { Router } from "express";
import { createProfessional, listProfessionals } from "../controllers/professionals.controller.js";
import { validateProfessional } from "../middleware/validate-professional.middleware.js";
import { requireSession, requireSessionCsrf } from "../middleware/auth.middleware.js";

const professionalsRouter = Router();

professionalsRouter.use(requireSession);
professionalsRouter.get("/", listProfessionals);
professionalsRouter.post("/", requireSessionCsrf, validateProfessional, createProfessional);

export default professionalsRouter;
