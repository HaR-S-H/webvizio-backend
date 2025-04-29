import Teacher from "../models/teacher.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const authTeacher = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(400,"email and password are required");
    }
    let teacher = await Teacher.findOne({ email });
    if (!teacher) { 
        const predefinedTeachers = JSON.parse(process.env.TEACHERS_LIST);
        const matchedTeacher = predefinedTeachers.find(
            t => t.email === email && t.password === password
        );
        if (!matchedTeacher) {
            throw new ApiError(403, "Unauthorized: You are not a registered teacher");
        }
        teacher = new Teacher({
            email: matchedTeacher.email,
            name: matchedTeacher.name,
            password: matchedTeacher.password,
        });
        await teacher.save();
    }
    else {
        const isPasswordValid = await teacher.isPasswordCorrect(password)
        if (!isPasswordValid) {
          throw new ApiError(401, "Invalid user credentials");
        }
    }
    const token = teacher.generateAccessToken();
    res.cookie("token", token, { httpOnly: false, secure: true });
    res.status(201).json(new ApiResponse(201,{teacher}, "Teacher registered successfully"));
 });

 
const logOutTeacher = asyncHandler(async (req, res) => { 
    return res.status(200).clearCookie("token").json(new ApiResponse(200, {}, "Teacher logged out successfully"));
})

export { authTeacher, logOutTeacher };