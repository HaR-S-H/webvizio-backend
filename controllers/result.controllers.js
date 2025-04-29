import Result from "../models/result.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";


const getResult = asyncHandler(async (req, res) => {
    const testId = req.params.id; 
    if (!testId) {
        throw new ApiError(400, "Test ID is required");
    }

    const result = await Result.findOne({ testId })
    .populate({
        path: "marks.studentId",
        select: "-password -ActiveTests -oldTests -marks"
    })
    .populate({
        path: "marks.plagrism.studentId",
        select: "-password -ActiveTests -oldTests -marks"
    });


    if (!result) {
        throw new ApiError(404, "Result not found");
    }
    res.status(200).json(new ApiResponse(200, { result }, "Result fetched successfully"));
});


export { getResult };