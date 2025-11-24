import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import { join } from "node:path";
import { existsSync } from "node:fs";

async function run() {
  try {
    const sbomPath = "sbom.json";
    const summaryPath = "summary.json";
    const cliPath = join(process.cwd(), "packages/cli/dist/index.js");

    const path = core.getInput("path");
    const image = core.getInput("image");
    const policy = core.getInput("policy");
    const markdownReport = core.getInput("markdown-report");
    const shouldUpload = core.getInput("upload") === "true";
    const token = core.getInput("token");
    let version = core.getInput("version");
    const failOnViolation = core.getInput("fail-on-violation") === "true";

    let scanCommand = `node ${cliPath} scan --output ${sbomPath} --summary ${summaryPath}`;

    if (image) {
      scanCommand += ` --image "${image}"`;
    } else {
      scanCommand += ` --path "${path}"`;
    }

    if (policy) {
      scanCommand += ` --policy "${policy}"`;
    }

    if (markdownReport) {
      scanCommand += ` --markdown "${markdownReport}"`;
    }

    if (!failOnViolation) {
      scanCommand += ` --no-fail-on-violation`;
    }

    core.info(
      `Running scan command: ${scanCommand.replace(cliPath, "clearbom")}`
    );

    await exec.exec(scanCommand);

    if (shouldUpload) {
      if (!token) {
        throw new Error("'token' input is required when 'upload' is true.");
      }

      if (!version) {
        version = github.context.ref || github.context.sha;
      }

      let uploadCommand = `node ${cliPath} upload --sbom ${sbomPath} --version "${version}"`;

      core.info(`Running upload command...`);

      await exec.exec(uploadCommand, [], {
        env: {
          ...process.env,
          CLEARBOM_TOKEN: token,
        },
      });
    }

    core.setOutput("sbom-path", sbomPath);
    core.setOutput("summary-path", summaryPath);
    
    if (markdownReport && existsSync(markdownReport)) {
      core.setOutput("report-path", markdownReport);
      await exec.exec(`cat ${markdownReport}`, [], {
        listeners: {
          stdout: (data: Buffer) => {
            core.summary.addRaw(data.toString());
          }
        }
      });
      await core.summary.write();
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

run();
