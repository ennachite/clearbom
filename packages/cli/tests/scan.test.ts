import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function runScanTest(fixtureName: string, componentName: string) {
  const fixturePath = join(process.cwd(), "tests/fixtures", fixtureName);
  const outputPath = join(fixturePath, "sbom.json");
  const cliPath = join(process.cwd(), "dist/index.js");

  // Clean up any existing SBOM
  if (existsSync(outputPath)) {
    execSync(`rm ${outputPath}`);
  }

  // Run scan
  execSync(`node ${cliPath} scan --path ${fixturePath} --quiet`, {
    stdio: "inherit",
  });

  // Verify SBOM exists
  expect(existsSync(outputPath)).toBe(true);

  // Verify SBOM structure
  const sbomContent = await readFile(outputPath, "utf-8");
  const sbom = JSON.parse(sbomContent);

  expect(sbom.bomFormat).toBe("CycloneDX");
  expect(["1.5", "1.6"]).toContain(sbom.specVersion);
  expect(sbom.components).toBeDefined();
  expect(sbom.components.length).toBeGreaterThan(0);

  // Verify a key component is in the list
  const keyComponent = sbom.components.find(
    (c: any) => c.name === componentName
  );
  expect(keyComponent).toBeDefined();

  // Clean up
  execSync(`rm ${outputPath}`);
}

describe("clearbom scan", () => {
  // Test for Node.js (existing test)
  it("should generate SBOM for Node.js project", async () => {
    await runScanTest("node-app", "express");
  }, 20000);

  // New Test for Python
  it("should generate SBOM for Python project", async () => {
    await runScanTest("python-app", "requests");
  }, 100000);

  // New Test for Java
  it("should generate SBOM for Java project", async () => {
    await runScanTest("java-app", "log4j-core");
  }, 30000);
});
