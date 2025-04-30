import fs from "fs";
import path from "path";

export async function vectorizeCode(codeFolderPath) {
  let allCode = "";

  const readFiles = dir => {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) readFiles(fullPath);
      else if (file.endsWith(".js") || file.endsWith(".jsx") || file.endsWith(".html") || file.endsWith(".css"))
        allCode += fs.readFileSync(fullPath, "utf-8");
    });
  };

  readFiles(codeFolderPath);

  const tokens = allCode.split(/\W+/).filter(Boolean);
  const tokenFreq = {};

  tokens.forEach(token => {
    tokenFreq[token] = (tokenFreq[token] || 0) + 1;
  });

  const topTokens = Object.keys(tokenFreq).sort((a, b) => tokenFreq[b] - tokenFreq[a]).slice(0, 100);
  const vector = topTokens.map(token => tokenFreq[token] || 0);

  return vector;
}
