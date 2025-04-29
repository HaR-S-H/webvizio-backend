import express from "express";
import verifyJwtTeacher from "../middlewares/teacher.middlewares.js";
import { getAllTests, updateTest, deleteTest, createTest } from "../controllers/teacherTest.controllers.js";
import { mixedUpload } from "../middlewares/multer.middlewares.js";
const router = express.Router();

  
router.get("/", verifyJwtTeacher, getAllTests);
router.post("/", verifyJwtTeacher,mixedUpload, createTest);
router.put("/:id", verifyJwtTeacher,mixedUpload, updateTest);
router.delete("/:id", verifyJwtTeacher, deleteTest);

export default router;