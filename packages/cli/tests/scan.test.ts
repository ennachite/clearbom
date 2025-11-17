import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function isMvnInstalled(): boolean {
  try {
    execSync("mvn --version", { stdio: "ignore", encoding: "utf-8" });
    return true;
  } catch (error) {
    console.warn('WARN: "mvn" command not found. Skipping Java SBOM test.');
    return false;
  }
}

function isDockerRunning(): boolean {
  try {
    execSync("docker ps", { stdio: "ignore", encoding: "utf-8" });
    return true;
  } catch (e) {
    console.warn(
      "WARN: Docker daemon not responsive. Skipping container image scan test."
    );
    return false;
  }
}

const hasMaven = isMvnInstalled();
const hasDocker = isDockerRunning();

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
  // Test for Node.js
  it("should generate SBOM for Node.js project", async () => {
    await runScanTest("node-app", "express");
  }, 20000);

  // Test for Python
  it("should generate SBOM for Python project", async () => {
    await runScanTest("python-app", "requests");
  }, 100000);

  // Test for Java
  it.skipIf(!hasMaven)(
    "should generate SBOM for Java project",
    async () => {
      await runScanTest("java-app", "log4j-core");
    },
    90000
  );

  // Container Image Scanning Test
  it.skipIf(!hasDocker)(
    "should generate SBOM for a container image",
    async () => {
      const cliPath = join(process.cwd(), "dist/index.js");
      const outputPath = join(process.cwd(), "image-sbom.json");
      const summaryPath = join(process.cwd(), "image-summary.json");

      if (existsSync(outputPath)) execSync(`rm ${outputPath}`);
      if (existsSync(summaryPath)) execSync(`rm ${summaryPath}`);

      execSync(
        `node ${cliPath} scan --image alpine:3.18 --output image-sbom.json --summary image-summary.json --quiet`,
        {
          stdio: "inherit",
        }
      );

      // Verify SBOM exists
      expect(existsSync(outputPath)).toBe(true);
      // Verify Summary exists
      expect(existsSync(summaryPath)).toBe(true);

      const sbomContent = await readFile(outputPath, "utf-8");
      const sbom = JSON.parse(sbomContent);

      expect(sbom.bomFormat).toBe("CycloneDX");
      expect(sbom.components).toBeDefined();
      expect(sbom.components.length).toBeGreaterThan(0);

      const osComponent = sbom.components.find((c: any) =>
        c.name.includes("alpine-baselayout")
      );
      expect(osComponent).toBeDefined();

      // Clean up
      execSync(`rm ${outputPath}`);
      execSync(`rm ${summaryPath}`);
    },
    120000
  );
});
