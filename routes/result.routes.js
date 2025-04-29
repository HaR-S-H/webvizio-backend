import express from "express";
import verifyJwtTeacher from "../middlewares/teacher.middlewares.js";
import { getResult } from "../controllers/result.controllers.js";
const router = express.Router();

router.get("/:id",verifyJwtTeacher, getResult);
export default router;