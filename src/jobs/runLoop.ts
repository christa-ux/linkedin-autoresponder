import { execFile } from 'node:child_process';
import { logger } from '../logger.js';
import { SessionError } from '../browser/session.js';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Last tick time per job; the watchdog reads this. */
export const heartbeats = new Map<string, number>();

let lastNotify = 0;
/** Loud local alert when only a human can fix things (expired session / checkpoint). macOS only, best effort. */
export function notifyHuman(message: string): void {
  if (process.platform !== 'darwin' || Date.now() - lastNotify < 10 * 60_000) return;
  lastNotify = Date.now();
  execFile('osascript', ['-e', `display notification ${JSON.stringify(message)} with title "LinkedIn bot" sound name "Basso"`], () => undefined);
}

/**
 * Run `tick` forever every `intervalMs`. A normal error is logged and the loop continues:
 * the process must never exit on a routine failure.
 */
export async function runLoop(
  name: string,
  intervalMs: number,
  tick: () => Promise<void>,
  opts: { isStopped: () => boolean; onError?: (err: unknown) => Promise<void> },
): Promise<void> {
  while (!opts.isStopped()) {
    heartbeats.set(name, Date.now());
    try {
      await tick();
    } catch (err) {
      if (err instanceof SessionError) {
        logger.fatal({ job: name }, err.message);
        notifyHuman('Session expired or checkpoint: run `npm run login`.');
        await sleep(60_000);
        continue;
      }
      logger.error({ job: name, err: (err as Error).message }, 'tick failed, continuing');
      await opts.onError?.(err).catch(() => undefined);
    }
    heartbeats.set(name, Date.now());
    await sleep(intervalMs);
  }
}
