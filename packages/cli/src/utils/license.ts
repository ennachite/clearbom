// SPDX license categorization
const PERMISSIVE_LICENSES = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC',
  '0BSD', 'Unlicense', 'WTFPL', 'CC0-1.0'
]);

const COPYLEFT_LICENSES = new Set([
  'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0',
  'MPL-2.0', 'EPL-1.0', 'EPL-2.0', 'CDDL-1.0', 'EUPL-1.2'
]);

const PROPRIETARY_LICENSES = new Set([
  'UNLICENSED', 'SEE LICENSE IN <filename>', 'COMMERCIAL'
]);

export type LicenseCategory = 'permissive' | 'copyleft' | 'proprietary' | 'unknown';

export function categorizeLicense(spdxId: string | undefined): LicenseCategory {
  if (!spdxId) return 'unknown';

  const normalized = spdxId.toUpperCase().replaceAll(/[- ]/g, '');

  // Check exact matches first
  if (PERMISSIVE_LICENSES.has(spdxId)) return 'permissive';
  if (COPYLEFT_LICENSES.has(spdxId)) return 'copyleft';
  if (PROPRIETARY_LICENSES.has(spdxId)) return 'proprietary';

  // Fuzzy matching for common variations
  if (normalized.includes('MIT')) return 'permissive';
  if (normalized.includes('APACHE')) return 'permissive';
  if (normalized.includes('BSD')) return 'permissive';
  if (normalized.includes('GPL')) return 'copyleft';

  return 'unknown';
}

export function extractLicenseId(component: any): string | undefined {
  if (!component.licenses || component.licenses.length === 0) {
    return undefined;
  }

  const firstLicense = component.licenses[0];
  
  if (firstLicense.license?.id) {
    return firstLicense.license.id;
  }
  
  if (firstLicense.license?.name) {
    return firstLicense.license.name;
  }

  if (firstLicense.expression) {
    // Handle expressions like "MIT OR Apache-2.0"
    // For simplicity, take the first license
    return firstLicense.expression.split(/\s+(OR|AND)\s+/)[0];
  }

  return undefined;
}