// packages/cli/src/scanners/image.ts
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CycloneDXBOM } from "../types.js";

export function isDockerInstalled(): boolean {
  try {
    execSync("docker ps", { stdio: "ignore", encoding: "utf-8" });
    return true;
  } catch (error) {
    return false;
  }
}

export async function scanImage(imageName: string): Promise<CycloneDXBOM> {
  const syftVersion = "v1.10.0";

  const tempFile = `clearbom-sbom-${Date.now()}.json`;
  const outputPath = join(tmpdir(), tempFile);

  const dockerCommand = [
    "docker run --rm",
    `-v "${tmpdir()}":/out`,
    `anchore/syft:${syftVersion}`,
    `packages ${imageName}`,
    "-o cyclonedx-json",
    `--file /out/${tempFile}`,
  ].join(" ");

  try {
    execSync(dockerCommand, {
      stdio: "pipe",
      encoding: "utf-8",
    });

    if (!existsSync(outputPath)) {
      throw new Error(
        "Syft (via Docker) ran but did not produce an output file."
      );
    }

    const sbomContent = await readFile(outputPath, "utf-8");
    const sbom: CycloneDXBOM = JSON.parse(sbomContent);

    // Clean up temp file
    execSync(`rm -f ${outputPath}`);

    return sbom;
  } catch (error) {
    let errMsg = `Syft (via Docker) scan failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    if (
      error instanceof Error &&
      (error.message.includes("connectex") ||
        error.message.includes("Cannot connect to the Docker daemon"))
    ) {
      errMsg =
        "Syft (via Docker) scan failed: Cannot connect to the Docker daemon. Is Docker running?";
    }
    throw new Error(errMsg);
  }
}
