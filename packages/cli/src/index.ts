#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { scanCommand } from './commands/scan.js';
import { versionCommand } from './commands/version.js';

const program = new Command();

program
  .name('clearbom')
  .description('Generate SBOMs and enforce license policies')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan a repository or container image')
  .option('-p, --path <path>', 'Path to scan', '.')
  .option('-i, --image <image>', 'Container image to scan')
  .option('-o, --output <file>', 'Output SBOM path', 'sbom.json')
  .option('--policy <file>', 'Policy file path', '.clearbom.yml')
  .option('--summary <file>', 'Summary output path', 'summary.json')
  .option('--fail-on-violation', 'Exit 1 on policy violation', true)
  .option(
    '--no-fail-on-violation',
    'Do not exit with status 1 when policy violations are found'
  )
  .option('--quiet', 'Suppress output', false)
  .option('--markdown <file>', 'Output summary as Markdown (e.g. report.md)')
  .action(scanCommand);

program
  .command('version')
  .description('Show version and check for updates')
  .action(versionCommand);

program.parse();
