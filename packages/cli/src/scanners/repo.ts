import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CycloneDXBOM } from "../types.js";

export async function scanRepository(path: string): Promise<CycloneDXBOM> {
  // Run cdxgen
  const outputPath = join(path, ".clearbom-temp-sbom.json");

  try {
    execSync(`npx @cyclonedx/cdxgen -o ${outputPath} ${path}`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (error) {
    throw new Error(
      `cdxgen failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Read and parse SBOM
  if (!existsSync(outputPath)) {
    throw new Error(
      `cdxgen failed: Output file ${outputPath} was not created.`
    );
  }
  const sbomContent = await readFile(outputPath, "utf-8");
  const sbom: CycloneDXBOM = JSON.parse(sbomContent);

  // Clean up temp file
  execSync(`rm -f ${outputPath}`);

  return sbom;
}
