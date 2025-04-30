import fs from "fs-extra";
import path from "path";
import stringSimilarity from "string-similarity";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, "results", "projects");

const getProjectCode = (projectPath) => {
  let code = "";
  const exts = [".js", ".jsx", ".html", ".css"];
  const walk = (dir) => {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
      else if (exts.includes(path.extname(fullPath)))
        code += fs.readFileSync(fullPath, "utf-8");
    });
  };
  walk(projectPath);
  return code;
};

export const checkPlagiarism = (studentId) => {
  const currentPath = path.join(BASE_DIR, `student_project_${studentId}`);
  const currentCode = getProjectCode(currentPath);

  const folders = fs.readdirSync(BASE_DIR).filter(f => 
    f.startsWith("student_project_") && f !== `student_project_${studentId}`
  );

  for (let folder of folders) {
    const otherId = folder.split("_")[2];
    const otherCode = getProjectCode(path.join(BASE_DIR, folder));
    const similarity = stringSimilarity.compareTwoStrings(currentCode, otherCode);
    if (similarity > 0.8) {
      return { isPlagiarized: true, matchedWith: otherId, score: similarity };
    }
  }

  return { isPlagiarized: false };
};
