import { describe, expect, it } from 'vitest';
import { watchdogAction } from '../src/watchdog.js';

describe('watchdogAction', () => {
  it('ok before the first beat and while fresh', () => {
    expect(watchdogAction(undefined, 1_000_000, 100, 200)).toBe('ok');
    expect(watchdogAction(1000, 1050, 100, 200)).toBe('ok');
  });
  it('reloads when stale, restarts when very stale', () => {
    expect(watchdogAction(1000, 1100, 100, 200)).toBe('reload');
    expect(watchdogAction(1000, 1200, 100, 200)).toBe('restart');
  });
});
