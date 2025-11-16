import { writeFile } from "node:fs/promises";
import { Logger } from "../utils/logger.js";
import { scanRepository } from "../scanners/repo.js";
import { categorizeLicense, extractLicenseId } from "../utils/license.js";
import type { ScanOptions, Summary } from "../types.js";

export async function scanCommand(options: ScanOptions) {
  const logger = new Logger(options.quiet);

  try {
    logger.info("Starting SBOM generation...");

    if (options.image) {
      logger.error("Container image scanning not yet implemented");
      process.exit(1);
    }

    // Generate SBOM
    logger.info(`Scanning repository at ${options.path}`);
    const sbom = await scanRepository(options.path);

    // Write SBOM
    await writeFile(options.output, JSON.stringify(sbom, null, 2));
    logger.success(`SBOM written to ${options.output}`);

    // Generate summary
    const summary = generateSummary(sbom);
    await writeFile(options.summary, JSON.stringify(summary, null, 2));
    logger.success(`Summary written to ${options.summary}`);

    // Display results
    displaySummary(summary, logger);

    logger.success("Scan completed successfully");
  } catch (error) {
    logger.error(
      `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

function generateSummary(sbom: any): Summary {
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
    violations: [],
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
