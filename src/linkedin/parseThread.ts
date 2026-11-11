import { createHash } from 'node:crypto';
import type { Attachment, Thread, ThreadMessage } from '../types.js';

export interface RawEvent {
  urn: string | null;
  fromOther: boolean;
  sender: string;
  time: string;
  text: string;
  images: number;
  gif: boolean;
  files: string[];
  audio: boolean;
  video: boolean;
  links: Array<{ url: string; title?: string }>;
}

export interface RawThread {
  url: string;
  headerTitle: string;
  events: RawEvent[];
}

const THREAD_ID_RE = /\/messaging\/thread\/(?!new\/)([^/?#]+)/;
const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"']+/gi;

export function threadIdFromUrl(url: string): string | null {
  return THREAD_ID_RE.exec(url)?.[1] ?? null;
}

export function toThread(raw: RawThread, sponsored = false): Thread {
  const id = threadIdFromUrl(raw.url);
  if (!id) throw new Error('not on an existing thread page');

  const messages: ThreadMessage[] = raw.events.map((e, i) => {
    const attachments: Attachment[] = [];
    for (let k = 0; k < e.images; k++) attachments.push({ kind: e.gif ? 'gif' : 'image' });
    for (const name of e.files) attachments.push({ kind: 'file', name: name || undefined });
    if (e.audio) attachments.push({ kind: 'audio' });
    if (e.video) attachments.push({ kind: 'video' });

    const links = [...e.links];
    for (const url of e.text.match(URL_IN_TEXT) ?? []) {
      if (!links.some((l) => l.url === url)) links.push({ url });
    }
    const key =
      e.urn ?? createHash('sha256').update(`${id}|${e.fromOther}|${e.sender}|${e.time}|${e.text}|${i}`).digest('hex');
    return {
      id: key,
      fromSelf: !e.fromOther,
      senderName: e.sender,
      text: e.text,
      timeLabel: e.time,
      attachments,
      links,
    };
  });

  const otherNames = new Set(raw.events.filter((e) => e.fromOther && e.sender).map((e) => e.sender));
  const isGroup = otherNames.size > 1 || /,|\band \d+ others?\b/i.test(raw.headerTitle);
  const otherName = raw.headerTitle.trim() || [...otherNames][0] || '';
  return { id, isGroup, isSponsored: sponsored, otherName, messages };
}
