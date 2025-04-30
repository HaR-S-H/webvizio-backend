import mongoose from "mongoose";

const codeVectorSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true,
  },
  vector: {
    type: [Number], // Can also use a string if you're storing a hash
    required: true,
  },
  githubLink: {
    type: String,
    required: true,
  }
}, { timestamps: true });

const CodeVector = mongoose.model("CodeVector", codeVectorSchema);
export default CodeVector;
