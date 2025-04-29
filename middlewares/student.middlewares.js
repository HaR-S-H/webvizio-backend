import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import Student from "../models/student.models.js";
const verifyJwtStudent = asyncHandler(async (req, res, next) => {
    try { 
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            
            throw new ApiError(401, "Unauthorized request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
       const student= await Student.findById(decodedToken?._id).select(
        "-password"
    )
        if (!student) {
            throw new ApiError(401,"invalid Access Token")
        }
        req.user = student
        next()
    } catch (error) {
        throw new ApiError(401,error.message || "invalid access Token")
    }
})


export default verifyJwtStudent;