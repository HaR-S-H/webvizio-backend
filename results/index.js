import simpleGit from "simple-git";
import { exec } from "child_process";
import fs from "fs-extra";
import path from "path";
import puppeteer from "puppeteer";
import Teacher from "../models/teacher.models.js";
import ApiError from "../utils/ApiError.js";
import Test from "../models/test.models.js";
import { spawn } from "child_process";
import Marks from "../models/marks.models.js";
import Result from "../models/result.models.js"; // Add this import

const __dirname = path.resolve();
const RESULT_DIR = path.join(__dirname, "results");
const BASE_DIR = path.join(RESULT_DIR, "projects");
const SCREENSHOT_DIR = path.join(RESULT_DIR, "screenshots");

fs.ensureDirSync(BASE_DIR);
fs.ensureDirSync(SCREENSHOT_DIR);

const getResult = async (testId, githubLink, studentId) => {
    const studentFolder = `student_project_${studentId}_${testId}`;
    const teacherFolder = `teacher_project_${testId}`;
    const studentProjectPath = path.join(BASE_DIR, studentFolder);
    const teacherProjectPath = path.join(BASE_DIR, teacherFolder);

    async function cloneRepo(repoUrl, folderName) {
        const projectPath = path.join(BASE_DIR, folderName);
        console.log(`Cloning ${repoUrl} into ${folderName}...`);
        await simpleGit().clone(repoUrl, projectPath);
        return projectPath;
    }

    function detectProjectType(projectPath) {
        const pkgPath = path.join(projectPath, "package.json");
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            if (pkg.dependencies?.react) return "react";
            if (pkg.dependencies?.express) return "ejs";
            return "node";
        }
        return "static";
    }

    function needsInstall(projectPath) {
        const nodeModulesPath = path.join(projectPath, "node_modules");
        const lockFile = path.join(projectPath, "package-lock.json");
        return !(fs.existsSync(nodeModulesPath) && fs.existsSync(lockFile));
    }

    function installDependencies(projectPath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(path.join(projectPath, "package.json"))) return resolve();
            if (!needsInstall(projectPath)) {
                console.log(`Skipping install: node_modules already exists in ${projectPath}`);
                return resolve();
            }

            console.log(`Installing dependencies in ${projectPath}...`);
            exec("npm install", { cwd: projectPath }, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Install error in ${projectPath}: ${stderr}`);
                    return reject(err);
                }
                resolve();
            });
        });
    }

    function startServer(projectPath, projectType, port) {
        return new Promise((resolve) => {
            let command = "";
            switch (projectType) {
                case "react": command = `npx vite --port=${port}`; break;
                case "ejs": command = `node index.js`; break;
                case "node": command = `npm start`; break;
                case "static": command = `npx live-server --port=${port} --quiet --no-browser`; break;
            }

            console.log(`Starting ${projectType} on port ${port}...`);
            const proc = exec(command, { cwd: projectPath });
            proc.stdout.on("data", data => console.log(data));
            proc.stderr.on("data", data => console.error(data));
            setTimeout(resolve, 5000);
        });
    }

    async function getAllRoutes(projectPath, type) {
        let routes = ["/"];
        if (type === "react") {
            const appJsx = path.join(projectPath, "src", "App.jsx");
            if (fs.existsSync(appJsx)) {
                const content = fs.readFileSync(appJsx, "utf8");
                const matches = content.match(/path=["'](\/[^"']*)["']/g);
                if (matches) routes = matches.map(m => m.match(/path=["'](\/[^"']*)["']/)[1]);
            }
        } else {
            const htmlPath = path.join(projectPath, "index.html");
            if (fs.existsSync(htmlPath)) {
                const content = fs.readFileSync(htmlPath, "utf8");
                const links = content.match(/href=["'](\/[^"']*)["']/g);
                if (links) routes.push(...links.map(l => l.match(/href=["'](\/[^"']*)["']/)[1]));
            }
        }
        return [...new Set(routes)];
    }

    async function captureScreenshots(baseUrl, projectPath, type, role) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        const screenshotFolder = path.join(SCREENSHOT_DIR, `${role}_screenshots_${testId}`);
        fs.ensureDirSync(screenshotFolder);
        try {
            const routes = await getAllRoutes(projectPath, type);
            for (let route of routes) {
                const url = `${baseUrl}${route}`;
                await page.goto(url, { waitUntil: "networkidle2" });
                await page.screenshot({ path: path.join(screenshotFolder, `screenshot${route.replace(/\//g, "_")}.png`) });
            }
        } catch (err) {
            console.error("Screenshot error:", err);
        } finally {
            await browser.close();
        }
    }

    function runComparisonScript() {
        return new Promise((resolve, reject) => {
            console.log("Running UI comparison script...");

            const pythonProcess = spawn('python', ['./results/compare.py']);
            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
                console.log(`Python output: ${data.toString()}`);  // Log entire output
            });

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
                console.error(`Python error: ${data.toString()}`);  // Log error output
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    return reject(new Error(`Python script failed with code ${code}`));
                }

                // Try to extract the score from the FINAL_SCORE line first (most reliable)
                const finalScoreMatch = stdoutData.match(/FINAL_SCORE:(\d+\.?\d*)/);
                if (finalScoreMatch && finalScoreMatch[1]) {
                    const similarityScore = parseFloat(finalScoreMatch[1]);
                    console.log(`UI Similarity score: ${similarityScore}%`);
                    return resolve(similarityScore);
                }
                
                // If that fails, try the "Final Overall UI Similarity Score" line
                const scoreMatch = stdoutData.match(/Final Overall UI Similarity Score[^\d]*(\d+\.\d+)%/i);
                if (scoreMatch && scoreMatch[1]) {
                    const similarityScore = parseFloat(scoreMatch[1]);
                    console.log(`UI Similarity score: ${similarityScore}%`);
                    return resolve(similarityScore);
                }
                
                console.warn("Could not extract score from Python output.");
                resolve(0);  // Default to 0 if score can't be extracted
            });
        });
    }

    async function deploy(studentRepo, teacherRepo) {
        // --- Student ---
        if (fs.existsSync(studentProjectPath)) fs.removeSync(studentProjectPath);
        await cloneRepo(studentRepo, studentFolder);
        const studentType = detectProjectType(studentProjectPath);
        if (studentType !== "static") await installDependencies(studentProjectPath);

        // --- Teacher ---
        let skipTeacherClone = false;
        if (fs.existsSync(teacherProjectPath)) {
            const gitConfig = path.join(teacherProjectPath, ".git", "config");
            if (fs.existsSync(gitConfig)) {
                const content = fs.readFileSync(gitConfig, "utf8");
                if (content.includes(teacherRepo)) skipTeacherClone = true;
            }
        }

        if (!skipTeacherClone) {
            if (fs.existsSync(teacherProjectPath)) fs.removeSync(teacherProjectPath);
            await cloneRepo(teacherRepo, teacherFolder);
            const teacherType = detectProjectType(teacherProjectPath);
            if (teacherType !== "static") await installDependencies(teacherProjectPath);
        }

        // --- Run & Capture ---
        await startServer(studentProjectPath, studentType, 5180);
        await startServer(teacherProjectPath, detectProjectType(teacherProjectPath), 5181);

        await captureScreenshots("http://localhost:5180", studentProjectPath, studentType, "student");
        await captureScreenshots("http://localhost:5181", teacherProjectPath, detectProjectType(teacherProjectPath), "teacher");

        console.log("Deployment complete!");

        // Run comparison script and return the score
        const score = await runComparisonScript();
        return score;
    }

    // --- MAIN FLOW ---
    try {
        const test = await Test.findById(testId);
        if (!test) throw new ApiError(404, "Test not found");

        const teacher = await Teacher.findById(test.teacher);
        if (!teacher) throw new ApiError(404, "Teacher not found");

        const matchedTest = teacher.ActiveTests.find(t => t.testId.toString() === testId.toString());
        if (!matchedTest) throw new ApiError(404, "No active test found for teacher");

        const studentRepoURL = githubLink;
        const teacherRepoURL = matchedTest.githubLink;

        console.log("Starting deployment and comparison process...");

        // Return immediately with default values
        const defaultResult = {
            marksObtained: 0,
            studentId: null
        };

        // Run the deploy process in the background without awaiting
        deploy(studentRepoURL, teacherRepoURL)
            .then(async (score) => {
                console.log(`Deployment and comparison complete with score: ${score}`);
                try {
                    // Update Marks document
                    const marks = await Marks.findOne({ studentId: studentId });
                    if (marks) {
                        const markDoc = marks.marks.find((m) => m.testId.toString() === testId.toString());
                        if (markDoc) {
                            markDoc.marksObtained = Math.ceil(score);
                            await marks.save();
                            console.log("Marks saved successfully");
                        } else {
                            console.log("Mark document not found for this test ID");
                        }
                    } else {
                        console.log("Marks document not found for this student ID");
                    }

                    // Update Result document
                    const result = await Result.findOne({ testId });
                    if (result) {
                        const resultDoc = result.marks.find((r) => r.studentId.toString() === studentId.toString());
                        if (resultDoc) {
                            resultDoc.marksObtained =Math.ceil(score);
                            await result.save();
                            console.log("Result saved successfully");
                        } else {
                            console.log("Result document not found for this student ID");
                        }
                    } else {
                        console.log("Result document not found for this test ID");
                    }
                } catch (error) {
                    console.error("Error saving scores:", error);
                }
                
                return score;
            })
            .catch(err => {
                console.error("Deploy error:", err);
                return 0;
            });

        // Return default result immediately
        return defaultResult;
    } catch (err) {
        console.error("Error:", err);
        throw new ApiError(500, "Error during result generation.");
    }
};

export default getResult;