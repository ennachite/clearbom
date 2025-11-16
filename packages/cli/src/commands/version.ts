import chalk from "chalk";

export async function versionCommand() {
  console.log(chalk.blue("ClearBOM CLI v0.1.0"));
  console.log("License: Apache-2.0");
  console.log("Docs: https://google.com");
}
