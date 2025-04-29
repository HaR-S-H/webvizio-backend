import mongoose from "mongoose";
const plagrismSchema = new mongoose.Schema({
    testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
        required: true
    },
    plagrismStudents: [
        {
           student1Id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
            student2Id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
       }
   ]
}, { timestamps: true });


const Plagrism = new mongoose.model("Plagrism", plagrismSchema);

export default Plagrism;