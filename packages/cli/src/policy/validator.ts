import { extractLicenseId } from "../utils/license.js";
import type { Policy } from "./types.js";
import type { CycloneDXBOM } from "../types.js";

export interface Violation {
  component: string;
  license: string;
  reason: string;
  severity: "error" | "warning";
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
  const { deny = [], warn = [], allow = [] } = policy.licenses;

  for (const component of components) {
    const licenseId = extractLicenseId(component);
    const compName = `${component.name}@${component.version || "unknown"}`;

    if (licenseId && deny.includes(licenseId)) {
      violations.push({
        component: compName,
        license: licenseId,
        reason: `License ${licenseId} is in the deny list`,
        severity: "error",
      });
      continue;
    }

    if (licenseId && warn.includes(licenseId)) {
      violations.push({
        component: compName,
        license: licenseId,
        reason: `License ${licenseId} flagged for review`,
        severity: "warning",
      });
    }

    if (allow.length > 0) {
      if (!licenseId || !allow.includes(licenseId)) {
         const isWarned = violations.some(v => v.component === compName && v.severity === 'warning');
         if (!isWarned) {
             violations.push({
                component: compName,
                license: licenseId || "UNKNOWN",
                reason: `License ${licenseId || "UNKNOWN"} is not in allow list`,
                severity: "error", 
             });
         }
      }
    }
    
    if (!licenseId && policy.licenses.unknown_action !== 'allow') {
        const severity = policy.licenses.unknown_action === 'deny' ? 'error' : 'warning';
        violations.push({
            component: compName,
            license: "UNKNOWN",
            reason: "Unknown license detected",
            severity
        });
    }
  }

  return violations;
}
