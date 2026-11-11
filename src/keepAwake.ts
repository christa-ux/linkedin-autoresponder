import { spawn } from 'node:child_process';
import { logger } from './logger.js';

/** macOS: block sleep for as long as this process lives (caffeinate exits with us). */
export function keepAwake(): void {
  if (process.platform !== 'darwin') {
    logger.warn('not macOS: disable sleep manually (see scripts/keep-awake.md)');
    return;
  }
  const child = spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore', detached: true });
  child.unref();
  logger.info('caffeinate: sleep disabled while the bot runs');
}
