import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CycloneDXBOM } from "../types.js";

export async function scanRepository(path: string): Promise<CycloneDXBOM> {
  const outputPath = join(path, ".clearbom-temp-sbom.json");

  if (existsSync(outputPath)) {
    try {
      rmSync(outputPath, { force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  let output = "";

  try {
    output = execSync(`npx @cyclonedx/cdxgen -o ${outputPath} -r ${path}`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (error: any) {
    let msg = error.message;
    if (error.stdout) msg += `\nSTDOUT: ${error.stdout.toString()}`;
    if (error.stderr) msg += `\nSTDERR: ${error.stderr.toString()}`;
    throw new Error(`cdxgen failed: ${msg}`);
  }

  // Read and parse SBOM
  if (!existsSync(outputPath)) {
    throw new Error(
      `cdxgen passed but output file was not created.\n\n--- cdxgen Logs ---\n${output}\n-------------------`
    );
  }

  const sbomContent = await readFile(outputPath, "utf-8");
  const sbom: CycloneDXBOM = JSON.parse(sbomContent);

  try {
    rmSync(outputPath, { force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

  return sbom;
}
