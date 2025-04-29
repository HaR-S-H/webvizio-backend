import Student from "../models/student.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Marks from "../models/marks.models.js";
import getResult from "../results/index.js"
import axios from "axios";
import Test from "../models/test.models.js";
import Result from "../models/result.models.js";
const getAllTests = asyncHandler(async (req, res) => { 
    const student = await Student.findById(req.user._id).select("-password").populate("ActiveTests", "-studentData -studentEmailIds").populate("oldTests", "-studentData -studentEmailIds");
    if (!student) {
        throw new ApiError(404, "Student not found");
    }
    res.status(200).json(new ApiResponse(200, { student }, "Tests fetched successfully"));
});


const submitTest = asyncHandler(async (req, res) => {
    const { testId, githubLink } = req.body;

    if (!testId || !githubLink) {
        throw new ApiError(400, "Test ID and GitHub link are required");
    }

    const student = await Student.findById(req.user._id).select("-password");
    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    // Regular expression to match GitHub URL and extract the owner and repo
    const validGithubLink = githubLink.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!validGithubLink) {
        throw new ApiError(400, "Invalid GitHub link format");
    }

    const [_, owner, repo] = validGithubLink;

    // Remove .git if present in the repository name
    const cleanRepo = repo.replace(/\.git$/, '');

    // Check if the repository exists on GitHub
    try {
        const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
            headers: { 
                "User-Agent": "GLA-Test-Checker",
                "Authorization": `token ${process.env.GITHUB_TOKEN}`
            }
        });

        if (repoResponse.status !== 200) {
            throw new Error("Repository not found");
        }
    } catch (error) {
        // Check if it's a 404 error from GitHub API
        if (error.response && error.response.status === 404) {
            throw new ApiError(404, "GitHub repository does not exist. Please check the repository link.");
        }
        // For any other errors, provide a general error message
        throw new ApiError(500, "Failed to validate GitHub repository");
    }

    const existingGithubLink = await Marks.findOne({ currGithubLink: githubLink });
    if (existingGithubLink) {
        const cheatedStudent = await Student.findById(existingGithubLink.studentId).select("-password -ActiveTests -oldTests -marks");
        throw new ApiError(400, "GitHub link already exists in the database", [cheatedStudent]);
    }

    const test = await Test.findById(testId);
    if (!test) {
        throw new ApiError(404, "Test not found");
    }

    const commitsApiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/commits`;
    let response;
    try {
        response = await axios.get(commitsApiUrl, {
            headers: { 
                "User-Agent": "GLA-Test-Checker",
                "Authorization": `token ${process.env.GITHUB_TOKEN}`
            }
        });
    } catch (error) {
        throw new ApiError(500, "Failed to fetch commits from GitHub");
    }

    const lastCommitDate = new Date(response.data[0].commit.committer.date);
    const testEndDate = new Date(test.endingTime);

    if (lastCommitDate > testEndDate) {
        throw new ApiError(403, "Last GitHub commit is after test end time");
    }

    let marks = await Marks.findOne({ studentId: student._id });

    const result = await getResult(testId, githubLink, student._id);
    console.log(result);
    
    const resultForTeacher = await Result.findOne({ testId });
    if (!resultForTeacher) {
        throw new ApiError(404, "Test not found in results");
    }

    resultForTeacher.marks.push({
        studentId: student._id,
        marksObtained: result.marksObtained,
        githubLink,
        plagiarism: [{
            detected: !!result.studentId,
            studentId: result.studentId || null
        }]
    });
    await resultForTeacher.save();

    const marksData = {
        testId,
        marksObtained: result.marksObtained,
        githubLink,
        plagiarism: [{
            detected: !!result.studentId,
            studentId: result.studentId || null
        }]
    };

    if (!marks) {
        marks = new Marks({
            studentId: student._id,
            currGithubLink: githubLink,
            marks: [marksData]
        });
        student.marks = marks._id;
     
        await student.save();
    } else {
        marks.currGithubLink = githubLink; // Update current github link
        marks.marks.push(marksData);
    }
    await marks.save();

    const isActive = student.ActiveTests.some(t => t.toString() === testId);
    if (!isActive) {
        throw new ApiError(404, "Test not found in active tests");
    }

    student.oldTests.push(test._id);
    student.ActiveTests = student.ActiveTests.filter(t => t.toString() !== testId);
    await student.save();

    res.status(200).json(new ApiResponse(200, { student }, "Test submitted successfully"));
});




export { getAllTests ,submitTest};

