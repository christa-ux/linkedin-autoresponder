import { describe, expect, it } from 'vitest';
import { classify } from '../src/responder/classify.js';
import { fallbackLine, validate } from '../src/responder/guardrails.js';
import { CANARY } from '../src/responder/prompt.js';
import type { Persona } from '../src/responder/persona.js';
import type { ThreadMessage } from '../src/types.js';
import { msg } from './helpers.js';

const persona: Persona = { name: 'Bot Owner', firstName: 'Bot', headline: '', facts: ['Public email: owner@example.com'] };

describe('validate', () => {
  it('accepts a normal reply', () => expect(validate('Hey! How are you?', persona)).toBeNull());
  it('rejects empty', () => expect(validate('  ', persona)).toBe('empty'));
  it('rejects placeholders', () => expect(validate('Hi [Name], thanks!', persona)).toBe('placeholder'));
  it('rejects AI tells', () => expect(validate('As an AI, I cannot do that.', persona)).toBe('ai_tell'));
  it('rejects prompt leaks', () => {
    expect(validate(`sure ${CANARY}`, persona)).toBe('prompt_leak');
    expect(validate('My system prompt says to be nice', persona)).toBe('prompt_leak');
  });
  it('rejects invented contact details', () => expect(validate('Call me at +33 6 12 34 56 78', persona)).toBe('contact_leak'));
  it('allows contact details from persona facts', () => expect(validate('Sure, owner@example.com works', persona)).toBeNull());
  it('allows honest assistant disclosure', () =>
    expect(validate("Fair question! An assistant is helping me keep up with messages right now.", persona)).toBeNull());
});

describe('fallbackLine', () => {
  const line = (text: string, attachments: ThreadMessage['attachments'] = []) => fallbackLine(classify([msg(text, { attachments })]));
  it('matches language', () => {
    expect(line('Bonjour, comment ça va ?')).toMatch(/Merci/);
    expect(line('Hola, ¿qué tal estás?')).toMatch(/Gracias/);
  });
  it('matches content', () => {
    expect(line('', [{ kind: 'audio' }])).toMatch(/listen/);
    expect(line('', [{ kind: 'image' }])).toMatch(/look/);
    expect(line('', [{ kind: 'file', name: 'a.pdf' }])).toMatch(/go through/);
    expect(line('?')).toBe("Hey! What's up?");
  });
  it('unknown language falls back to English', () => expect(line('qwrtx zzk')).toMatch(/Thanks/));
});
