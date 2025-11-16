import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CycloneDXBOM } from "../types.js";

export async function scanRepository(path: string): Promise<CycloneDXBOM> {
  // Detect ecosystem
  const ecosystem = await detectEcosystem(path);

  if (!ecosystem) {
    throw new Error(
      "Unsupported project type. Expected package.json, requirements.txt, or pom.xml"
    );
  }

  // Run cdxgen
  const outputPath = join(path, ".clearbom-temp-sbom.json");

  try {
    execSync(
      `npx @cyclonedx/cdxgen -o ${outputPath} -t ${ecosystem} ${path}`,
      {
        stdio: "pipe",
        encoding: "utf-8",
      }
    );
  } catch (error) {
    throw new Error(
      `cdxgen failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Read and parse SBOM
  const sbomContent = await readFile(outputPath, "utf-8");
  const sbom: CycloneDXBOM = JSON.parse(sbomContent);

  // Clean up temp file
  execSync(`rm -f ${outputPath}`);

  return sbom;
}

async function detectEcosystem(path: string): Promise<string | null> {
  if (existsSync(join(path, "package.json"))) {
    return "nodejs";
  }
  if (
    existsSync(join(path, "requirements.txt")) ||
    existsSync(join(path, "setup.py"))
  ) {
    return "python";
  }
  if (existsSync(join(path, "pom.xml"))) {
    return "java";
  }
  if (existsSync(join(path, "go.mod"))) {
    return "go";
  }
  return null;
}
