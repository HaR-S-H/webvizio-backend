import Test from "../models/test.models.js";
import Student from "../models/student.models.js";
import xlsx from "xlsx";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Teacher from "../models/teacher.models.js";
import Result from "../models/result.models.js";
import fs from "fs-extra";
import sendOTP from "../utils/nodeMailer.js";
import crypto from "crypto";
const createTest = asyncHandler(async (req, res) => {
  const {
    name,
    language,
    maxMarks,
    course,
    startingTime,
    endingTime,
    tips,
    githubLink
  } = req.body;

  const requiredFields = [name, language, maxMarks, course, startingTime, endingTime, tips, githubLink];
  if (requiredFields.some(field => typeof field === "string" && field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  if (!req.files?.pdf || !req.files?.video || !req.files?.excel) {
    throw new ApiError(400, "PDF, Video, and Excel files are required");
  }

  // Get PDF and Video URLs from S3
  const pdfUrl = req.files['pdf'][0].location;
  const videoUrl = req.files['video'][0].location;

  // Read Excel from local uploads folder
  const excelPath = req.files['excel'][0].path;
  const excelBuffer = fs.readFileSync(excelPath);
  const workbook = xlsx.read(excelBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const studentObjectIds = [];
  const studentEmails = [];
  const sendEmailList = [];
  for (let row of data) {
    const { Roll, Course, Name, section, Email } = row;
    if (!Roll || !Course || !Name || !section || !Email) continue;

    let student = await Student.findOne({ email: Email });
    
    if (!student) {
      student = new Student({
        name: Name,
        email: Email,
        password: "", 
        rollNo: Roll,
        section,
        course: Course,
        year: "1st",
        ActiveTests: []
      });
      
      await student.save();
      sendEmailList.push(student.email);
    }

    studentObjectIds.push(student._id);
    studentEmails.push(student.email);
  }

  const test = new Test({
    name,
    language,
    maxMarks,
    teacher: req.user._id,
    course,
    startingTime,
    endingTime,
    tips: typeof tips === "string" ? JSON.parse(tips) : tips,
    pdfUrl,
    videoUrl,
    studentData: studentObjectIds,
    studentEmailIds: studentEmails
  });

  await test.save();

  const teacher = await Teacher.findById(req.user._id);
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  teacher.ActiveTests.push({ testId: test._id, githubLink });
  await teacher.save();

  await Student.updateMany(
    { _id: { $in: studentObjectIds } },
    { $addToSet: { ActiveTests: test._id } }
  );

   generateAndSendOTPs(sendEmailList);
  
  await new Result({ testId: test._id }).save();

  try {
    await fs.unlink(excelPath);
    console.log("✅ Excel file deleted successfully after processing");
  } catch (err) {
    console.error("❌ Failed to delete Excel file:", err);
  }

  res.status(200).json(new ApiResponse(200, { test }, "Test created successfully"));
});

const generateAndSendOTPs = async (studentEmails) => {
  try {
    
    const students = await Student.find({ email: { $in: studentEmails } });


    for (const student of students) {
      const otp = crypto.randomInt(100000, 999999).toString();
      student.password = otp;
      await student.save();
      
      await sendOTP(student.email, otp); 
    }
  } catch (error) {
    console.error("Error in generating and sending OTPs:", error.message);
  }
};


const getAllTests = asyncHandler(async (req, res) => { 
    const teacher = await Teacher.findById(req.user._id).populate({
      path: 'ActiveTests.testId',
      select: '-studentData -studentEmailIds',
    }).populate({
      path: 'oldTests.testId',
      select: '-studentData -studentEmailIds',
    })
    if (!teacher) {
        throw new ApiError(404, "No tests found");
    }
    res.status(200).json(new ApiResponse(200, { teacher }, "Tests fetched successfully"));
})

const updateTest = asyncHandler(async (req, res) => { 
  const { id } = req.params;
  const { name, language, maxMarks, course, startingTime, endingTime, tips, githubLink } = req.body;
  
  
  const requiredFields = [name, language, maxMarks, course, startingTime, endingTime, tips, githubLink];
  if (requiredFields.some(field => typeof field === "string" && field.trim() === "")) {
      throw new ApiError(400, "All fields are required");
  }

  if (!req.files?.pdf || !req.files?.video || !req.files?.excel) {
      throw new ApiError(400, "PDF, Video, and Excel files are required");
  }

  const pdfUrl = req.files['pdf'][0].location;
  const videoUrl = req.files['video'][0].location;
 
  const excelPath = req.files['excel'][0].path;
  const excelBuffer = fs.readFileSync(excelPath);
  const workbook = xlsx.read(excelBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
  const studentObjectIds = [];
  const studentEmails = [];
  const sendEmailList = []; 

  for (let row of data) {
      const { Roll, Course, Name, section, Email } = row;
      if (!Roll || !Course || !Name || !section || !Email) continue;

      let student = await Student.findOne({ email: Email });

      if (!student) {
          const otp = crypto.randomInt(100000, 999999).toString();
        sendEmailList.push(Email);

          student = new Student({
              name: Name,
              email: Email,
              password: otp,
              rollNo: Roll,
              section,
              course: Course,
              year: "1st",
              ActiveTests: []
          });

          await student.save();
      } else {
          
          if (student.password === "") {
        
              sendEmailList.push(student.email);
          }

         
          student.name = Name;
          student.rollNo = Roll;
          student.section = section;
          student.course = Course;
          await student.save();
      }

      studentObjectIds.push(student._id);
      studentEmails.push(student.email);
  }


  const test = await Test.findByIdAndUpdate(id, {
      name,
      language,
    maxMarks,
      teacher: req.user._id,
      course,
      startingTime,
      endingTime,
      tips: typeof tips === "string" ? JSON.parse(tips) : tips,
      pdfUrl,
      videoUrl,
      studentData: studentObjectIds,
      studentEmailIds: studentEmails
  }, { new: true });

  if (!test) {
      throw new ApiError(404, "Test not found");
  }
  const teacher = await Teacher.findById(req.user._id);
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

const existingTest = teacher.ActiveTests.find(test => test.testId.toString() === test._id.toString());

if (!existingTest) {
  teacher.ActiveTests.push({ testId: test._id, githubLink });
} 
  await teacher.save();

  await Student.updateMany(
    { _id: { $in: studentObjectIds } },
    { $addToSet: { ActiveTests: test._id } }
  );

  if (sendEmailList.length > 0) {
     generateAndSendOTPs(sendEmailList);
  }
  try {
    await fs.unlink(excelPath);
    console.log("✅ Excel file deleted successfully after processing");
  } catch (err) {
    console.error("❌ Failed to delete Excel file:", err);
  }
  res.status(200).json(new ApiResponse(200, { test }, "Test updated successfully"));
});

const deleteTest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const testId = id;
    const test = await Test.findById(testId);
    if (!test) {
        throw new ApiError(404, "Test not found");
    }
    await Test.findByIdAndDelete(testId);
    await Student.updateMany(
        { _id: { $in: test.studentData } },
        { $pull: { ActiveTests: testId } }
  );
  await Teacher.updateMany(
    { _id: req.user._id },
    { $pull: { ActiveTests: { testId } } }
  );
  await Result.findOneAndDelete({ testId });
    res.status(200).json(new ApiResponse(200, { }, "Test deleted successfully"));
}
);

export {getAllTests, createTest, updateTest, deleteTest};