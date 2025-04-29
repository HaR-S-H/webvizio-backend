import express from "express";
import verifyJwtStudent from "../middlewares/student.middlewares.js";
import { authStudent,logOutStudent } from "../controllers/studentAuth.controllers.js";
const router = express.Router();

router.post("/",authStudent);
router.post("/logout",verifyJwtStudent, logOutStudent);
export default router;