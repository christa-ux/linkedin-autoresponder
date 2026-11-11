export const SOFT_MAX = 300;
export const HARD_MAX = 600;

const PREFIX_RE = /^(?:reply|response|answer|me|message)\s*:\s*/i;
const SIGNOFF_LINE =
  /^(?:best(?: regards| wishes)?|kind regards|warm regards|regards|cheers|sincerely|cordialement|bien à (?:vous|toi)|saludos|un saludo|viele grüße)\s*[,!.]?$/i;

export function postprocess(raw: string): string {
  let t = raw.trim();
  t = t.replace(PREFIX_RE, '');
  t = t.replace(/^["“”'«]\s*([\s\S]*?)\s*["“”'»]$/u, '$1');
  t = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/`([^`]+)`/g, '$1');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '');
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  const idx = lines.findIndex((l, i) => i > 0 && i >= lines.length - 2 && SIGNOFF_LINE.test(l));
  if (idx > 0) lines.splice(idx);
  t = lines.join('\n');
  // Em dashes read as AI-written.
  t = t.replace(/\s*[—–]\s*/g, ', ');
  // Enter sends in LinkedIn's composer, so keep it on one line.
  t = t.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/,\s*([.!?])/g, '$1');
  if (t.length > HARD_MAX) t = capAtSentence(t, HARD_MAX);
  return t;
}

function capAtSentence(t: string, max: number): string {
  const slice = t.slice(0, max);
  const end = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  return end > max / 2 ? slice.slice(0, end + 1) : `${slice.slice(0, slice.lastIndexOf(' '))}…`;
}
