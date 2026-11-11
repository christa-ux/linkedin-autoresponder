import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: { paths: ['apiKey', '*.apiKey', 'cookie', '*.cookie', 'headers.authorization'], censor: '[redacted]' },
  transport: process.stdout.isTTY ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } : undefined,
});

/** Logs message length only, unless LOG_CONTENT=true. */
export function content(text: string): string | { length: number } {
  return config.LOG_CONTENT ? text : { length: text.length };
}
