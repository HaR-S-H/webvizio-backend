import mongoose from "mongoose";
const marksSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    currGithubLink: {
        type: String,
    },
    marks: [
        {
            testId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Test",
                required: true
            },
            marksObtained: {
                type: Number,
                required: true,
                default: 0

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


const Marks = new mongoose.model("Marks", marksSchema);

export default Marks;