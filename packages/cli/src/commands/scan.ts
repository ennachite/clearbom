import { writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { Logger } from "../utils/logger.js";
import { scanRepository } from "../scanners/repo.js";
import { scanImage } from "../scanners/image.js";
import { categorizeLicense, extractLicenseId } from "../utils/license.js";
import { loadPolicy } from "../policy/parser.js";
import { validatePolicy } from "../policy/validator.js";
import type { CycloneDXBOM, ScanOptions, Summary } from "../types.js";

export async function scanCommand(options: ScanOptions) {
  const logger = new Logger(options.quiet);
  let sbom: CycloneDXBOM;

  try {
    logger.info("Starting SBOM generation...");

    const targetPath = resolve(options.path ?? ".");

    if (options.image) {
      logger.info(`Scanning container image: ${options.image}`);
      if (options.path && options.path !== '.') {
        logger.warn("Scanning both an image and a path is not yet fully supported. Scanning image only.");
      }
      sbom = await scanImage(options.image);
    } else {
      logger.info(`Scanning repository at ${targetPath}`);
      sbom = await scanRepository(targetPath);
    }

    const outputPath = resolveOutputPath(options.output, targetPath);
    await writeFile(outputPath, JSON.stringify(sbom, null, 2));
    logger.success(`SBOM written to ${outputPath}`);

    const policy = await loadPolicy(options.policy);
    let violations: any[] = [];

    if (policy) {
      logger.info(`Validating against policy: ${options.policy}`);
      violations = validatePolicy(sbom, policy);
    }

    // Generate summary
    const summary = generateSummary(sbom, violations);
    const summaryPath = resolveOutputPath(options.summary, targetPath);
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
    logger.success(`Summary written to ${summaryPath}`);

    // Display results
    displaySummary(summary, logger);

    // Handle violations
    if (violations.length > 0) {
      logger.error(`\n❌ Policy violations detected (${violations.length}):`);
      for (const violation of violations) {
        logger.error(`   ${violation.component}: ${violation.reason}`);
      }

      if (options.failOnViolation) {
        process.exit(1);
      }
    } else if (policy) {
      logger.success("\n✅ All policy checks passed");
    }

    logger.success("Scan completed successfully");
  } catch (error) {
    logger.error(
      `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

function generateSummary(sbom: CycloneDXBOM, violations: any[]): Summary {
  const components = sbom.components || [];

  const licenses = {
    permissive: 0,
    copyleft: 0,
    proprietary: 0,
    unknown: 0,
  };

  for (const component of components) {
    const licenseId = extractLicenseId(component);
    const category = categorizeLicense(licenseId);
    licenses[category]++;
  }

  return {
    timestamp: new Date().toISOString(),
    components: components.length,
    licenses,
    violations: violations.map((v) => `${v.component}: ${v.reason}`),
  };
}

function displaySummary(summary: Summary, logger: Logger) {
  logger.info(`\n📊 Summary:`);
  logger.info(`   Components: ${summary.components}`);
  logger.info(`   Licenses:`);
  logger.info(`     Permissive: ${summary.licenses.permissive}`);
  logger.info(`     Copyleft: ${summary.licenses.copyleft}`);
  logger.info(`     Proprietary: ${summary.licenses.proprietary}`);
  logger.info(`     Unknown: ${summary.licenses.unknown}`);
}

function resolveOutputPath(path: string, basePath: string) {
  return isAbsolute(path) ? path : join(basePath, path);
}
