import pino, { type Logger, type LoggerOptions } from 'pino';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getAppConfig } from '../config';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const _loggers: Map<string, Logger> = new Map();

function ensureLogDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function createLoggerOptions(level: LogLevel = 'info'): LoggerOptions {
  const config = getAppConfig();
  const isDev = config.nodeEnv === 'development';
  const isTest = config.nodeEnv === 'test';

  return {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}),
    },
    transport: isDev && !isTest
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '[{module}] {msg}',
          },
        }
      : undefined,
  };
}

export function createLogger(module: string, level?: LogLevel): Logger {
  const config = getAppConfig();
  
  if (_loggers.has(module)) {
    return _loggers.get(module)!;
  }

  const options = createLoggerOptions(level || (config.nodeEnv === 'production' ? 'info' : 'debug'));
  const logger = pino(options).child({ module });

  _loggers.set(module, logger);
  return logger;
}

export function createModuleLogger(module: string, level?: LogLevel): Logger {
  const config = getAppConfig();
  const isTest = config.nodeEnv === 'test';
  
  if (isTest) {
    return createLogger(module, level);
  }

  if (_loggers.has(module)) {
    return _loggers.get(module)!;
  }

  const logDir = resolve(process.cwd(), 'logs');
  const logPath = resolve(logDir, `${module}.log`);
  
  ensureLogDir(logDir);

  const logLevel = level || (config.nodeEnv === 'production' ? 'info' : 'debug');
  const isDev = config.nodeEnv === 'development';

  const streams: pino.StreamEntry[] = [];

  if (isDev) {
    streams.push({
      level: logLevel,
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: `[${module}] {msg}`,
        },
      }),
    });
  }

  streams.push({
    level: logLevel,
    stream: pino.transport({
      target: 'pino/file',
      options: { destination: logPath },
    }),
  });

  const logger = pino({ level: logLevel }, pino.multistream(streams)).child({ module });
  _loggers.set(module, logger);
  
  return logger;
}

export const logger = {
  app: () => createModuleLogger('app'),
  db: () => createModuleLogger('db'),
  api: () => createModuleLogger('api'),
  ws: () => createModuleLogger('ws'),
  bootstrap: () => createModuleLogger('bootstrap'),
  module: (name: string) => createModuleLogger(name),
};

export type { Logger };
