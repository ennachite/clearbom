import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import YAML from 'yaml';
import { PolicySchema, type Policy } from './types.js';

export async function loadPolicy(path: string): Promise<Policy | null> {
  if (!existsSync(path)) {
    return null;
  }

  const content = await readFile(path, 'utf-8');
  const parsed = YAML.parse(content);
  
  try {
    return PolicySchema.parse(parsed);
  } catch (error) {
    throw new Error(`Invalid policy file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}