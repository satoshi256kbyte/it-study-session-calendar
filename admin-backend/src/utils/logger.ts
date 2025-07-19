export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel

  private constructor() {
    const envLogLevel = process.env.LOG_LEVEL || 'INFO'
    this.logLevel = this.parseLogLevel(envLogLevel)
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return LogLevel.ERROR
      case 'WARN':
        return LogLevel.WARN
      case 'INFO':
        return LogLevel.INFO
      case 'DEBUG':
        return LogLevel.DEBUG
      default:
        return LogLevel.INFO
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level <= this.logLevel) {
      const timestamp = new Date().toISOString()
      const levelName = LogLevel[level]
      const logMessage = `${timestamp} [${levelName}] ${message}`

      if (args.length > 0) {
        console.log(logMessage, ...args)
      } else {
        console.log(logMessage)
      }
    }
  }

  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args)
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args)
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args)
  }

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args)
  }

  public getLogLevel(): LogLevel {
    return this.logLevel
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }
}

// シングルトンインスタンスをエクスポート
export const logger = Logger.getInstance()
