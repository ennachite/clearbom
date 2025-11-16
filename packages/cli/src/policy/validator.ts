import { extractLicenseId } from "../utils/license.js";
import type { Policy } from "./types.js";
import type { CycloneDXBOM } from "../types.js";

export interface Violation {
  component: string;
  license: string;
  reason: string;
}

export function validatePolicy(
  sbom: CycloneDXBOM,
  policy: Policy
): Violation[] {
  if (!policy.licenses) {
    return [];
  }

  const violations: Violation[] = [];
  const components = sbom.components || [];

  for (const component of components) {
    const licenseId = extractLicenseId(component);

    // Check deny list
    if (
      policy.licenses.deny &&
      licenseId &&
      policy.licenses.deny.includes(licenseId)
    ) {
      violations.push({
        component: `${component.name}@${component.version || "unknown"}`,
        license: licenseId,
        reason: `License ${licenseId} is denied by policy`,
      });
    }

    // Check allow list (if specified, only allowed licenses are permitted)
    if (policy.licenses.allow && policy.licenses.allow.length > 0) {
      if (!licenseId || !policy.licenses.allow.includes(licenseId)) {
        violations.push({
          component: `${component.name}@${component.version || "unknown"}`,
          license: licenseId || "UNKNOWN",
          reason: `License ${licenseId || "UNKNOWN"} is not in allow list`,
        });
      }
    }

    // Handle unknown licenses
    if (!licenseId && policy.licenses.unknown_action === "deny") {
      violations.push({
        component: `${component.name}@${component.version || "unknown"}`,
        license: "UNKNOWN",
        reason: "Unknown license detected and policy denies unknowns",
      });
    }
  }

  return violations;
}
