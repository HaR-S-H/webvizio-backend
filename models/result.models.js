import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
    testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
        required: true
    },
    marks: [
        {
            studentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
            marksObtained: {
                type: Number,
                required: true,
            },
            githubLink: {
                type: String,
                required: true
            },
            plagrism: [
                {
                    detected: {
                        type: Boolean,
                        default: false
                    },
                    studentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Student",
                    }
                }
            ]
        }
    ]
}, { timestamps: true });

const Result = new mongoose.model("Result", resultSchema);

export default Result;