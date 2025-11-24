# ClearBOM

Open-source SBOM generator with license policy enforcement.

## Features

- 🔍 Generate CycloneDX SBOMs for Node.js, Python, and Java
- 🐳 Scan container images (requires Docker)
- 📋 Enforce license policies (allow/deny lists)
- 🚫 Fail builds on policy violations
- 🔐 Optional upload to ClearBOM SaaS (coming soon)

## Installation

Install the command-line tool globally from NPM:

```bash
npm install -g clearbom
```

**Prerequisites:**

  * **Node.js:** v20 or newer
  * **Image Scans:** Requires `docker` to be installed and running.

## Usage

All commands generate an `sbom.json` and `summary.json` in the current directory by default.

### Scan a Local Repository

This will scan the current directory, auto-detecting all project types (e.g., Node.js, Java).

```bash
clearbom scan
```

Or specify a path:

```bash
clearbom scan --path ./my-project
```

### Scan a Container Image

This will scan a container image using Docker.

```bash
clearbom scan --image alpine:latest
```

### Enforce a Policy

Fail the scan if licenses denied in your policy file are found.

```bash
clearbom scan --policy ./.clearbom.yml
```

By default the CLI exits with code 1 when violations are found. To allow the scan
to succeed (useful for reporting-only runs), add `--no-fail-on-violation`.

### Specify Output Files

Customize the output file paths.

```bash
clearbom scan --path ./my-app --output my-app-sbom.json --summary my-app-summary.json
```

### Generate a Markdown Report

Produce a human-readable Markdown summary alongside the JSON outputs:

```bash
clearbom scan --path ./my-app --policy ./.clearbom.yml --markdown report.md
```
The flag respects `--fail-on-violation` / `--no-fail-on-violation` just like JSON outputs.

### Check Version

Display the currently installed version.

```bash
clearbom version
```

## License

Apache-2.0
