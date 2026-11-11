import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  // Redact secret-looking fields even if they are logged by mistake.
  redact: { paths: ['apiKey', '*.apiKey', 'cookie', '*.cookie', 'headers.authorization'], censor: '[redacted]' },
  transport: process.stdout.isTTY ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } : undefined,
});

/**
 * Message text is other people's personal data. By default we log only its length.
 * LOG_CONTENT=true is for local debugging and logs are git-ignored either way.
 */
export function content(text: string): string | { length: number } {
  return config.LOG_CONTENT ? text : { length: text.length };
}
