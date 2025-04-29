import express from "express";
import dotenv from "dotenv";
import connectedDB from "./db/connection.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import teacherTestRoute from "./routes/teacherTest.routes.js";
import studentAuthRoute from "./routes/studentAuth.routes.js";
import teacherAuthRoute from "./routes/teacherAuth.routes.js";
import studentTestRoute from "./routes/studentTest.routes.js";
import markRoute from "./routes/marks.routes.js"
import resultRoute from "./routes/result.routes.js";
import "./cronjobs/moveTeacherTests.js";
import "./cronjobs/moveStudentTests.js";
import path from "path";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors(
    {
        origin: "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    }
));
app.use(express.urlencoded({ extended: true }));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cookieParser());
app.use("/api/v1/auth/teacher", teacherAuthRoute);
app.use("/api/v1/auth/student", studentAuthRoute);
app.use("/api/v1/test/teacher", teacherTestRoute);
app.use("/api/v1/test/student", studentTestRoute);
app.use("/api/v1/result", resultRoute);
app.use("/api/v1/marks", markRoute);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server is listening at ${PORT}`);
    connectedDB();
})