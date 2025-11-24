import { writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { Logger } from "../utils/logger.js";
import { scanRepository } from "../scanners/repo.js";
import { scanImage } from "../scanners/image.js";
import { categorizeLicense, extractLicenseId } from "../utils/license.js";
import { loadPolicy } from "../policy/parser.js";
import { validatePolicy, type Violation } from "../policy/validator.js";
import { toMarkdown } from "../utils/formatter.js";
import type { CycloneDXBOM, ScanOptions, Summary } from "../types.js";

export async function scanCommand(options: ScanOptions) {
  const logger = new Logger(options.quiet);
  let sbom: CycloneDXBOM;

  try {
    logger.info("Starting SBOM generation...");
    const targetPath = resolve(options.path ?? ".");

    if (options.image) {
      logger.info(`Scanning container image: ${options.image}`);
      if (options.path && options.path !== ".") {
        logger.warn(
          "Scanning both an image and a path is not yet fully supported. Scanning image only."
        );
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
    let violations: Violation[] = [];

    if (policy) {
      logger.info(`Validating against policy: ${options.policy}`);
      violations = validatePolicy(sbom, policy);
    }

    const summary = generateSummary(sbom, violations);

    const summaryPath = resolveOutputPath(options.summary, targetPath);
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
    logger.success(`Summary written to ${summaryPath}`);

    if (options.markdown) {
      const mdContent = toMarkdown(summary);
      const mdPath = resolveOutputPath(options.markdown, targetPath);
      await writeFile(mdPath, mdContent);
      logger.success(`Report written to ${mdPath}`);
    }

    // Display results
    displaySummary(summary, logger);

    const errors = violations.filter((v) => v.severity === "error");

    if (errors.length > 0 && options.failOnViolation) {
      logger.error(
        `\n❌ Scan failed: ${errors.length} critical policy violations.`
      );
      process.exit(1);
    } else if (violations.length > 0) {
      logger.warn(`\n⚠️ Scan passed with ${violations.length} warnings.`);
    } else {
      logger.success("\n✅ No policy violations found.");
    }
  } catch (error) {
    logger.error(
      `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

function generateSummary(sbom: any, violations: Violation[]): Summary {
  const components = sbom.components || [];
  const licenses = { permissive: 0, copyleft: 0, proprietary: 0, unknown: 0 };
  const risk = { red: 0, yellow: 0, green: 0 };

  const violationMap = new Map<string, string>();
  for (const v of violations) {
    violationMap.set(v.component, v.severity);
  }

  for (const component of components) {
    const licenseId = extractLicenseId(component);
    const category = categorizeLicense(licenseId);
    licenses[category]++;

    const compName = `${component.name}@${component.version || "unknown"}`;
    const severity = violationMap.get(compName);

    if (severity === "error") {
      risk.red++;
    } else if (severity === "warning") {
      risk.yellow++;
    } else {
      risk.green++;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    components: components.length,
    licenses,
    risk,
    violations: violations.map((v) => ({
      component: v.component,
      reason: v.reason,
      severity: v.severity,
    })),
  };
}

function displaySummary(summary: Summary, logger: Logger) {
  logger.info(`\n📊 Summary:`);
  logger.info(`   Components: ${summary.components}`);
  logger.info(`   Risk Analysis:`);
  if (summary.risk.red > 0)
    logger.error(`     🔴 Critical: ${summary.risk.red}`);
  if (summary.risk.yellow > 0)
    logger.warn(`     🟡 Warning:  ${summary.risk.yellow}`);
  logger.success(`     🟢 Safe:     ${summary.risk.green}`);
}

function resolveOutputPath(path: string, basePath: string) {
  return isAbsolute(path) ? path : join(basePath, path);
}
