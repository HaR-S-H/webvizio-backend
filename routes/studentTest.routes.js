import express from "express";
import verifyJwtStudent from "../middlewares/student.middlewares.js";
import { getAllTests,submitTest} from "../controllers/studentTest.controllers.js";
const router = express.Router();

router.get("/", verifyJwtStudent, getAllTests);
router.post("/", verifyJwtStudent, submitTest);

export default router;