import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('clearbom scan', () => {
  it('should generate SBOM for Node.js project', async () => {
    const fixturePath = join(process.cwd(), 'tests/fixtures/node-app');
    const outputPath = join(fixturePath, 'sbom.json');

    // Clean up any existing SBOM
    if (existsSync(outputPath)) {
      execSync(`rm ${outputPath}`);
    }

    // Run scan
    execSync(`node ${join(process.cwd(), 'dist/index.js')} scan --path ${fixturePath} --quiet`, {
      stdio: 'inherit'
    });

    // Verify SBOM exists
    expect(existsSync(outputPath)).toBe(true);

    // Verify SBOM structure
    const sbomContent = await readFile(outputPath, 'utf-8');
    const sbom = JSON.parse(sbomContent);

    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(['1.5', '1.6']).toContain(sbom.specVersion);
    expect(sbom.components).toBeDefined();
    expect(sbom.components.length).toBeGreaterThan(0);

    // Verify express is in components
    const expressComponent = sbom.components.find((c: any) => c.name === 'express');
    expect(expressComponent).toBeDefined();
  }, 20000);
});
