import chalk from "chalk";

export class Logger {
  constructor(private quiet: boolean = false) {}

  success(message: string) {
    if (!this.quiet) {
      console.log(chalk.green("✓"), message);
    }
  }

  error(message: string) {
    console.error(chalk.red("✗"), message);
  }

  info(message: string) {
    if (!this.quiet) {
      console.log(chalk.blue("ℹ"), message);
    }
  }

  warn(message: string) {
    if (!this.quiet) {
      console.log(chalk.yellow("⚠"), message);
    }
  }
}
