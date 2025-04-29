import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
const teacherSchema = new mongoose.Schema({
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
        required: true
    },
    avatar: {
        type: String,
    },
    ActiveTests: [
        {
            testId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Test",
            },
            githubLink:{
                type: String,
                required: true
            }
    }],
    oldTests: [
        {
            testId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Test",
            },
            githubLink:{
                type: String,
                required: true
            }
    }
    ]
}, { timestamps: true });

teacherSchema.pre('save',async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

teacherSchema.methods.isPasswordCorrect = async function (password) { 
    return await bcrypt.compare(password, this.password);
}

teacherSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        name:this.name
    }, process.env.ACCESS_TOKEN_SECRET,
        {
       expiresIn:process.env.ACCESS_TOKEN_EXPIRY
   })
}

const Teacher = new mongoose.model("Teacher", teacherSchema);

export default Teacher;