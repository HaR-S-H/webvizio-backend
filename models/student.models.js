import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    avatar: {
        type: String,
    },
    rollNo: {
        type: String,
        required: true,
        unique: true
    },
    section: {
        type: String,
        required: true
    },
    course: {
        type: String,
    },
    year: {
        type: String,
    },
    ActiveTests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
        required: true
    }],
    marks: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Marks",
    },
    oldTests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Marks",
        }
    ]
    
}, { timestamps: true });

studentSchema.pre('save',async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

studentSchema.methods.isPasswordCorrect = async function (password) { 
    return await bcrypt.compare(password, this.password);
}

studentSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        name:this.name
    }, process.env.ACCESS_TOKEN_SECRET,
        {
       expiresIn:process.env.ACCESS_TOKEN_EXPIRY
   })
}

const Student = new mongoose.model("Student", studentSchema);

export default Student;