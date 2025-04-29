// middlewares/mixedUpload.js

import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "../utils/s3.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Local disk storage for Excel
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "./uploads";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// S3 storage for PDF and Video
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const fileName = `${Date.now()}_${file.originalname}`;
    cb(null, fileName);
  }
});


// Custom storage engine decision
const storage = (req, file, cb) => {
  if (file.fieldname === "pdf" || file.fieldname === "video") {
    // Use S3 for pdf and video
    s3Storage._handleFile(req, file, cb);
  } else if (file.fieldname === "excel") {
    // Use local for excel
    diskStorage._handleFile(req, file, cb);
  } else {
    cb(new Error("Invalid field name"), null);
  }
};

// Use multer disk engine with custom handler
const upload = multer({ storage: { _handleFile: storage, _removeFile: (req, file, cb) => cb(null) } });

export const mixedUpload = upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "video", maxCount: 1 },
  { name: "excel", maxCount: 1 }
]);
