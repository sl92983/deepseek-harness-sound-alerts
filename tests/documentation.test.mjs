import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
    "icons", "docs", "firmware"
  ]) {
    assert.equal(script.includes(`  "${entry}"`), true, `${entry} must be packaged`);
  }
});

test("the public tree contains Chrome, ESP32, and demo media but no private WiFi config", () => {
  const required = [
    "manifest.json",
    "content.js",
    "firmware/esp32-dsh-light/esp32-dsh-light.ino",
    "firmware/esp32-dsh-light/wifi_config.example.h",
    "media/eggy-1.jpg",
    "media/eggy-2.jpg",
    "media/eggy-3.jpg",
    "media/eggy-4.jpg",
    "media/eggy-demo.mp4"
  ];
  for (const path of required) {
    const target = join(root, ...path.split("/"));
    assert.equal(existsSync(target), true, `${path} should exist`);
    assert.ok(statSync(target).size > 0, `${path} should not be empty`);
  }
  assert.equal(existsSync(join(root, "firmware/esp32-dsh-light/wifi_config.h")), false);
});
