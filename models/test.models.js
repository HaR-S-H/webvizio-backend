import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true
  },
  language: {
    type: String,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  startingTime: {
    type: Date,
    required: true
  },
  endingTime: {
    type: Date,
    required: true
  },
  tips: {
    type: [String],
    required: true
  },
  studentData: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    }
    ],
  studentEmailIds: [
    {
      type: String,
      required: true
    }
  ]
}, { timestamps: true });

const Test = mongoose.model("Test", testSchema);

export default Test;
