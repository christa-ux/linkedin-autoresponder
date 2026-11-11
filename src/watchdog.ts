import { logger } from './logger.js';
import { heartbeats } from './jobs/runLoop.js';

export type WatchdogAction = 'ok' | 'reload' | 'restart';

export interface WatchedJob {
  name: string;
  /** Stale this long: reload the job's tab. */
  softMs: number;
  /** Stale this long: exit so pm2 restarts everything. */
  hardMs: number;
  reload: () => Promise<void>;
}

export function watchdogAction(lastBeat: number | undefined, now: number, softMs: number, hardMs: number): WatchdogAction {
  if (lastBeat === undefined) return 'ok';
  const age = now - lastBeat;
  if (age >= hardMs) return 'restart';
  if (age >= softMs) return 'reload';
  return 'ok';
}

export function startWatchdog(jobs: WatchedJob[], everyMs = 15_000): NodeJS.Timeout {
  const reloadedFor = new Map<string, number>();
  return setInterval(() => {
    for (const job of jobs) {
      const beat = heartbeats.get(job.name);
      const action = watchdogAction(beat, Date.now(), job.softMs, job.hardMs);
      if (action === 'restart') {
        logger.fatal({ job: job.name }, 'job stuck, exiting so pm2 restarts the bot');
        process.exit(1);
      }
      // One reload per stall, not one every check.
      if (action === 'reload' && reloadedFor.get(job.name) !== beat) {
        reloadedFor.set(job.name, beat!);
        logger.warn({ job: job.name }, 'job stalled, reloading its tab');
        void job.reload().catch((err) => logger.error({ job: job.name, err: (err as Error).message }, 'reload failed'));
      }
    }
  }, everyMs);
}
