import express from "express";
import verifyJwtTeacher from "../middlewares/teacher.middlewares.js";
import { authTeacher, logOutTeacher } from "../controllers/teacherAuth.controllers.js";
const router = express.Router();

router.post("/",authTeacher);
router.post("/logout",verifyJwtTeacher, logOutTeacher);
export default router;