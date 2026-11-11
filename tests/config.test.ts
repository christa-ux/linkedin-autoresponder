import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('config', () => {
  it('treats an empty API key as unset (so the ant CLI login is used)', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: '' }).ANTHROPIC_API_KEY).toBeUndefined();
    expect(loadConfig({ ANTHROPIC_API_KEY: '  ' }).ANTHROPIC_API_KEY).toBeUndefined();
  });
  it('parses booleans and defaults', () => {
    const c = loadConfig({ DRY_RUN: 'true' });
    expect(c.DRY_RUN).toBe(true);
    expect(c.HEADLESS).toBe(false);
    expect(c.MESSAGES_POLL_SECONDS).toBe(3);
  });
  it('fails fast on invalid values', () => expect(() => loadConfig({ MESSAGES_POLL_SECONDS: 'abc' })).toThrow(/MESSAGES_POLL_SECONDS/));
});
