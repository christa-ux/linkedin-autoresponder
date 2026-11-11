import { describe, expect, it } from 'vitest';
import { type RawEvent, threadIdFromUrl, toThread } from '../src/linkedin/parseThread.js';

const ev = (p: Partial<RawEvent>): RawEvent => ({
  urn: null, fromOther: true, sender: 'Test Sender', time: '10:00', text: '', images: 0, gif: false, files: [], audio: false, video: false, links: [], ...p,
});
const URL_OK = 'https://www.linkedin.com/messaging/thread/2-abc==/';

describe('threadIdFromUrl', () => {
  it('reads existing thread ids', () => expect(threadIdFromUrl(URL_OK)).toBe('2-abc=='));
  it('rejects the compose screen', () => expect(threadIdFromUrl('https://www.linkedin.com/messaging/thread/new/')).toBeNull());
});

describe('toThread', () => {
  it('maps sides, urns, attachments and links', () => {
    const t = toThread({
      url: URL_OK,
      headerTitle: 'Test Sender',
      events: [
        ev({ urn: 'urn:1', text: 'hey' }),
        ev({ urn: 'urn:2', images: 1 }),
        ev({ urn: 'urn:3', text: 'see https://example.com/a' }),
        ev({ urn: 'urn:4', files: ['deck.pdf'] }),
        ev({ urn: 'urn:5', fromOther: false, sender: 'Bot Owner', text: 'hi!' }),
      ],
    });
    expect(t.id).toBe('2-abc==');
    expect(t.isGroup).toBe(false);
    expect(t.messages.map((m) => m.id)).toEqual(['urn:1', 'urn:2', 'urn:3', 'urn:4', 'urn:5']);
    expect(t.messages[1]!.attachments).toEqual([{ kind: 'image' }]);
    expect(t.messages[2]!.links).toEqual([{ url: 'https://example.com/a' }]);
    expect(t.messages[3]!.attachments).toEqual([{ kind: 'file', name: 'deck.pdf' }]);
    expect(t.messages[4]!.fromSelf).toBe(true);
  });
  it('falls back to a stable hash key without urn', () => {
    const raw = { url: URL_OK, headerTitle: 'X', events: [ev({ text: 'a' })] };
    expect(toThread(raw).messages[0]!.id).toBe(toThread(raw).messages[0]!.id);
    expect(toThread(raw).messages[0]!.id).toMatch(/^[0-9a-f]{64}$/);
  });
  it('detects group threads', () => {
    const t = toThread({ url: URL_OK, headerTitle: 'A', events: [ev({ sender: 'A' }), ev({ sender: 'B' })] });
    expect(t.isGroup).toBe(true);
    expect(toThread({ url: URL_OK, headerTitle: 'A, B and 2 others', events: [] }).isGroup).toBe(true);
  });
  it('refuses to parse the compose screen', () =>
    expect(() => toThread({ url: 'https://www.linkedin.com/messaging/thread/new/', headerTitle: '', events: [] })).toThrow());
});
