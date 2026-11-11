import { describe, expect, it } from 'vitest';
import { isBlocked, nameFromTitle } from '../src/browser/session.js';

describe('session helpers', () => {
  it('reads the display name from the profile tab title', () => {
    expect(nameFromTitle('(3) Test Account | LinkedIn')).toBe('Test Account');
    expect(nameFromTitle('Test Account | LinkedIn')).toBe('Test Account');
    expect(nameFromTitle('(99+) Test Account | LinkedIn')).toBe('Test Account');
  });
  it('detects login / checkpoint redirects', () => {
    expect(isBlocked('https://www.linkedin.com/checkpoint/challenge/x')).toBe(true);
    expect(isBlocked('https://www.linkedin.com/login?x=1')).toBe(true);
    expect(isBlocked('https://www.linkedin.com/authwall?trk=1')).toBe(true);
    expect(isBlocked('https://www.linkedin.com/feed/')).toBe(false);
  });
});
