import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting Prisma Dataset Seeding...");

// Locate python in virtual environment or fallback to system python
const venvPythonWin = path.resolve(__dirname, "..", "src", "fastapi", ".venv", "Scripts", "python.exe");
const venvPythonUnix = path.resolve(__dirname, "..", "src", "fastapi", ".venv", "bin", "python");
const scriptPath = path.resolve(__dirname, "seed_dataset.py");

let pythonCmd = "python";
import fs from 'fs';
if (fs.existsSync(venvPythonWin)) {
  pythonCmd = `"${venvPythonWin}"`;
} else if (fs.existsSync(venvPythonUnix)) {
  pythonCmd = `"${venvPythonUnix}"`;
}

try {
  console.log(`Executing dataset ingestion via Python (${pythonCmd})...`);
  execSync(`${pythonCmd} "${scriptPath}"`, { stdio: "inherit" });
  console.log("Prisma Seeding completed successfully!");
} catch (err) {
  console.error("Seeding error:", err);
  process.exit(1);
}
