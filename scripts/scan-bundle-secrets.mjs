import { readFileSync } from "node:fs";
import { globSync } from "glob";

const files = globSync("dist/**/*.{js,css,html,map}", { nodir: true });
const patterns = [
  /\bGEMINI[_-]?API[_-]?KEY\b/gi,
  /\bgemini[_-]?api[_-]?key\b/gi,
  /AIza[0-9A-Za-z\-_]{20,}/g,
  /process\.env\.GEMINI_API_KEY/g,
  /import\.meta\.env\.[A-Z0-9_]*GEMINI[A-Z0-9_]*/g,
  /apiKey\s*[:=]\s*["']AIza[0-9A-Za-z\-_]{20,}["']/g,
];

if (files.length === 0) {
  console.error("No dist bundle files found. Run npm run build first.");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      findings.push({ file, pattern: pattern.toString(), snippet: match[0] });
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secret leakage found in build output:");
  for (const finding of findings) {
    console.error(`- ${finding.file} matched ${finding.pattern}: ${finding.snippet}`);
  }
  process.exit(1);
}

console.log("Bundle secret scan passed: no Gemini key indicators found.");
