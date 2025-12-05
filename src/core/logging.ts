import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private verbose: boolean;
  private logLevel: LogLevel;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
    this.logLevel = verbose ? LogLevel.DEBUG : LogLevel.INFO;
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red('✗'), message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(chalk.yellow('⚠'), message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(chalk.blue('ℹ'), message, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(chalk.green('✓'), message, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(chalk.gray('→'), message, ...args);
    }
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
    this.logLevel = verbose ? LogLevel.DEBUG : LogLevel.INFO;
  }
}



