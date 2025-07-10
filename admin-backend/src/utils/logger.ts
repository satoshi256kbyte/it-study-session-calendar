enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const getLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO'
  switch (level) {
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

const currentLogLevel = getLogLevel()

export const logger = {
  error: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LogLevel.ERROR) {
      console.error(message, ...args)
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(message, ...args)
    }
  },
  info: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LogLevel.INFO) {
      console.log(message, ...args)
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.log(message, ...args)
    }
  },
}
