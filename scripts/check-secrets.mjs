import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("../", import.meta.url));
const skippedDirectories = new Set([".git", "build", "dist", "node_modules"]);
const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".zip", ".7z", ".gz",
  ".exe", ".dll", ".pdf", ".woff", ".woff2"
]);
const forbiddenFiles = new Set([
  "github.txt", ".env", "credentials.json"
]);

const rules = [
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/ },
  { name: "API secret", regex: /\b(?:sk|rk)-[A-Za-z0-9_-]{20,}/ },
  { name: "AWS access key", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}/ },
  { name: "JWT", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: "credential in URL", regex: /https?:\/\/[^\s/:@]+:[^\s/@]+@/i },
  { name: "local user profile path", regex: /[A-Za-z]:\\Users\\[^\\\s]+/ }
];

const assignmentRule = /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|passwd)\s*[:=]\s*["']([^"']+)["']/i;
const safeExamples = /^(?:|YOUR_|CHANGE|CHANGEME|EXAMPLE|TEST|DEMO|XXXX|<|\$\{)/i;
const findings = [];

function addFinding(file, line, rule) {
  findings.push(`${relative(root, file)}:${line}: ${rule}`);
}

function scanText(file, text) {
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const rule of rules) {
      if (rule.regex.test(lineText)) addFinding(file, index + 1, rule.name);
    }
    const assignment = lineText.match(assignmentRule);
    if (assignment && !safeExamples.test(assignment[1])) {
      addFinding(file, index + 1, "possible hard-coded secret");
    }
  });
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      findings.push(`${relative(root, file)}: symbolic links require manual review`);
      continue;
    }
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!entry.isFile()) continue;
    const lowerName = entry.name.toLowerCase();
    if (forbiddenFiles.has(lowerName) || /^\.env\./.test(lowerName) || /^credentials-.+\.json$/.test(lowerName)) {
      addFinding(file, 1, "private configuration file must not be published");
      continue;
    }
    if (binaryExtensions.has(extname(lowerName)) || statSync(file).size > 2_000_000) continue;
    const buffer = readFileSync(file);
    if (buffer.includes(0)) continue;
    scanText(file, buffer.toString("utf8"));
  }
}

walk(root);
if (findings.length) {
  console.error("Potential secrets or private files detected (values are not displayed):");
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Secret scan passed: no matching credentials or private configuration files found.");
}
