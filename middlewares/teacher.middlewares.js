import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import Teacher from "../models/teacher.models.js";
const verifyJwtTeacher = asyncHandler(async (req, res, next) => {
    try { 
      
        
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "")
       
        
        if (!token) {
            
            throw new ApiError(401, "Unauthorized request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
       const teacher= await Teacher.findById(decodedToken?._id).select(
        "-password"
        )
        
        
        if (!teacher) {
            throw new ApiError(401,"invalid Access Token")
        }
        req.user = teacher;
        next()
    } catch (error) {
        throw new ApiError(401,error.message || "invalid access Token")
    }
})


export default verifyJwtTeacher;