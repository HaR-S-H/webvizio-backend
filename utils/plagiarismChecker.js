import CodeVector from "../models/codeVector.models.js";
import Marks from "../models/marks.models.js";
import Result from "../models/result.models.js";
import { vectorizeCode } from "./vectorizer.js"; // You'll create this

export async function checkPlagiarism(studentId, testId, codePath, githubLink) {
  const newVector = await vectorizeCode(codePath); // returns array of floats

  const existingVectors = await CodeVector.find({ testId });

  for (const other of existingVectors) {
    const similarity = cosineSimilarity(newVector, other.vector);
    if (similarity >= 0.8) {
      await storePlagiarismData(studentId, testId, other.studentId);
      return { plagiarised: true, matchedWith: other.studentId };
    }
  }

  // If not plagiarised, store this new code vector
  await CodeVector.create({ studentId, testId, vector: newVector, githubLink });
  return { plagiarised: false };
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

async function storePlagiarismData(studentId, testId, matchedStudentId) {
  const entry = { detected: true, studentId: matchedStudentId };

    const marksDoc = await Marks.findOne({ studentId });
    const marksDoc2 = await Marks.findOne({ studentId:matchedStudentId});
  if (marksDoc) {
    const mark = marksDoc.marks.find(m => m.testId.toString() === testId.toString());
      if (mark) {
          mark.marksObtained = 0;
        mark.plagrism[0].detected = true;
        mark.plagrism[0].studentId = matchedStudentId;
      await marksDoc.save();
    }
  }
  if (marksDoc2) {
    const mark = marksDoc2.marks.find(m => m.testId.toString() === testId.toString());
      if (mark) {
        mark.marksObtained = 0;
        mark.plagrism[0].detected = true;
        mark.plagrism[0].studentId =studentId;
      await marksDoc2.save();
    }
  }

  const resultDoc = await Result.findOne({ testId });
  if (resultDoc) {
    const mark = resultDoc.marks.find(m => m.studentId.toString() === studentId.toString());
    const mark2 = resultDoc.marks.find(m => m.studentId.toString() === matchedStudentId.toString());
      if (mark) {
        mark.marksObtained = 0; 
      mark.plagrism[0].detected=true;
      mark.plagrism[0].studentId=matchedStudentId;
      await resultDoc.save();
    }
      if (mark2) {
    mark2.marksObtained = 0;
      mark2.plagrism[0].detected=true;
      mark2.plagrism[0].studentId=studentId;
      await resultDoc.save();
    }
  }
}
