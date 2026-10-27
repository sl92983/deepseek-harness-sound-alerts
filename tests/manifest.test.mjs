import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const manifestUrl = new URL("../manifest.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
const packageMetadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function projectFile(path) {
  return new URL(`../${path}`, import.meta.url);
}

test("manifest is MV3 and every referenced local file exists", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.version, packageMetadata.version);
  const files = [
    ...manifest.content_scripts.flatMap((entry) => entry.js),
    ...Object.values(manifest.icons)
  ];
  for (const path of files) {
    assert.equal(existsSync(projectFile(path)), true, `${path} should exist`);
  }
});

test("the extension stays limited to the two local Harness origins", () => {
  const expectedOrigins = ["http://127.0.0.1:3080/*", "http://localhost:3080/*"];
  assert.deepEqual(manifest.host_permissions, expectedOrigins);
  assert.deepEqual(manifest.content_scripts[0].matches, expectedOrigins);
  assert.deepEqual(manifest.content_scripts[0].js, ["content.js"]);
});

test("there are no permissions, background workers, remote code, or externally connectable APIs", () => {
  assert.deepEqual(manifest.permissions, []);
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.content_security_policy, undefined);
  assert.equal(manifest.optional_host_permissions, undefined);
  assert.doesNotMatch(JSON.stringify(manifest), /https:\/\/.*\.js/);
});
