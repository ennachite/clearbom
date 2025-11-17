import { execSync } from "node:child_process";
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

  const dockerCommand = [
    "docker run --rm",
    "-v /var/run/docker.sock:/var/run/docker.sock",
    `anchore/syft:${syftVersion}`,
    `scan ${imageName}`,
    "-o cyclonedx-json",
  ].join(" ");

  try {
    const sbomContent = execSync(dockerCommand, {
      stdio: "pipe",
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!sbomContent) {
      throw new Error("Syft (via Docker) ran but produced no output.");
    }

    const sbom: CycloneDXBOM = JSON.parse(sbomContent);

    return sbom;
  } catch (error) {
    let errMsg = `Syft (via Docker) scan failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    if (
      error instanceof Error &&
      (error.message.includes("connectex") ||
        error.message.includes("Cannot connect to the Docker daemon"))
    ) {
      errMsg =
        "Syft (via Docker) scan failed: Cannot connect to the Docker daemon. Is Docker running?";
    }
    if (error instanceof Error && (error as any).stderr) {
      errMsg += `\nSTDERR: ${(error as any).stderr.toString()}`;
    }
    throw new Error(errMsg);
  }
}
