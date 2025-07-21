import type { EnvConfig } from './env.js';

export function createLogger(config: EnvConfig) {
  const logLevel = config.LOG_LEVEL;
  const isPretty = config.LOG_FORMAT === 'pretty';
  
  return {
    level: logLevel,
    transport: isPretty ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      }
    } : undefined,
  };
}