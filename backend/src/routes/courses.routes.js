import { Router } from "express";
import { createCourse, listCourses } from "../controllers/courses.controller.js";
import { validateCourse } from "../middleware/validate-course.middleware.js";
import { requireSession, requireSessionCsrf } from "../middleware/auth.middleware.js";

const coursesRouter = Router();

coursesRouter.use(requireSession);
coursesRouter.get("/", listCourses);
coursesRouter.post("/", requireSessionCsrf, validateCourse, createCourse);

export default coursesRouter;
