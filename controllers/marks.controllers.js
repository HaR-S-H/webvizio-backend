import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Marks from "../models/marks.models.js";
const getStudentMarks = asyncHandler(async (req, res) => { 
    const marks=await Marks.findOne({studentId:req.user._id}).populate("marks.testId","-studentData -studentEmailIds").populate("marks.plagrism.studentId","-password ActiveTests -oldTests -marks")
     if (!marks) {
         throw new ApiError(404, "Student not found");
     }
     res.status(200).json(new ApiResponse(200, {marks }, "Marks fetched successfully"));
});
 
export { getStudentMarks };