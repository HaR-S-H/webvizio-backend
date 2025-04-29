import redis from "redis";
import Student from "../models/student.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const redisClient = redis.createClient();
redisClient.connect();

const authStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  
  let student = await Student.findOne({ email });
  if (!student) {
    throw new ApiError(403, "Unauthorized: You are not a registered student");
  }

 
  const isPasswordValid = await student.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

 
  // const existingSession = await redisClient.get(email);
  // if (existingSession) {
  //   throw new ApiError(403, "This account is already logged in from another session");
  // }


  const token = student.generateAccessToken();


  // await redisClient.set(email, token, { EX: process.env.REDIS_EXPIRATION_TIME }); 

 
  res.cookie("token", token, { httpOnly:false, secure: true });
  res.status(201).json(new ApiResponse(201, { student }, "Student logged in successfully"));
});


const logOutStudent = asyncHandler(async (req, res) => {
  const  email  = req.user.email;
  await redisClient.del(email);

  
  res.status(200).clearCookie("token").json(new ApiResponse(200, {}, "Student logged out successfully"));
});

export { authStudent, logOutStudent };
