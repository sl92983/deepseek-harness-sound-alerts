import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(path);
    return entry.isFile() ? [path] : [];
  });
}

const files = filesBelow(root);
const markdownFiles = files.filter((file) => extname(file) === ".md");

test("every relative Markdown link and image resolves to a packaged project file", () => {
  assert.equal(markdownFiles.length >= 6, true);
  for (const file of markdownFiles) {
    const markdown = readFileSync(file, "utf8");
    for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      let destination = match[1].trim().replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:|#)/.test(destination)) continue;
      destination = destination.split("#")[0];
      if (!destination) continue;
      const target = resolve(dirname(file), decodeURIComponent(destination));
      assert.equal(existsSync(target), true, `${file} links to missing ${match[1]}`);
    }
  }
});

test("the ZIP allowlist includes every linked documentation and visual directory", () => {
  const script = readFileSync(join(root, "scripts/package-extension.ps1"), "utf8");
  for (const entry of [
    "manifest.json", "content.js", "README.md", "README.zh-CN.md",
    "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CHANGELOG.md",
    "icons", "assets", "docs"
  ]) {
    assert.equal(script.includes(`  "${entry}"`), true, `${entry} must be packaged`);
  }
});

test("the public repository remains Chrome-only with no hardware scope leftovers", () => {
  const hardwarePattern = new RegExp(["ES" + "P32", "WS" + "2812", "WiFi" + "Multi", "dsh" + "-light", "firm" + "ware"].join("|"), "i");
  const textExtensions = new Set([".js", ".mjs", ".json", ".md", ".yml", ".ps1"]);
  for (const file of files) {
    if (!textExtensions.has(extname(file))) continue;
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, hardwarePattern, file);
  }
});
