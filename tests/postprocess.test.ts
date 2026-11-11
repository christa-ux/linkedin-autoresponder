import { describe, expect, it } from 'vitest';
import { HARD_MAX, postprocess } from '../src/responder/postprocess.js';

describe('postprocess', () => {
  it('strips wrapping quotes and prefixes', () => {
    expect(postprocess('"Hey! How are you?"')).toBe('Hey! How are you?');
    expect(postprocess('Reply: Sounds good!')).toBe('Sounds good!');
  });
  it('strips markdown and bullets', () => {
    expect(postprocess('**Sure**, here:\n- one\n- two')).toBe('Sure, here: one two');
  });
  it('removes sign-offs', () => {
    expect(postprocess('Sounds great, talk then!\n\nBest regards,\nAlex')).toBe('Sounds great, talk then!');
    expect(postprocess('Sounds great!\nCheers')).toBe('Sounds great!');
  });
  it('replaces em dashes', () => expect(postprocess('Sure — happy to chat')).toBe('Sure, happy to chat'));
  it('flattens newlines (Enter would send)', () => expect(postprocess('Hey!\nHow are you?')).toBe('Hey! How are you?'));
  it('caps length at a sentence boundary', () => {
    const out = postprocess('This is a sentence. '.repeat(60));
    expect(out.length).toBeLessThanOrEqual(HARD_MAX);
    expect(out.endsWith('.')).toBe(true);
  });
});
