import express from "express";
import verifyJwtStudent from "../middlewares/student.middlewares.js";
import { getStudentMarks } from "../controllers/marks.controllers.js";
const router = express.Router();

router.get("/",verifyJwtStudent, getStudentMarks);
export default router;