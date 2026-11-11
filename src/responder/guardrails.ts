import type { Classification } from '../types.js';
import type { Persona } from './persona.js';
import { CANARY } from './prompt.js';
import { HARD_MAX } from './postprocess.js';

export type Rejection = 'empty' | 'too_long' | 'placeholder' | 'ai_tell' | 'prompt_leak' | 'contact_leak';

const PLACEHOLDER_RE = /\[(?:name|your name|insert|date|time|company|link)[^\]]*\]|\{\{.*?\}\}|<(?:name|insert)[^>]*>/i;
const AI_TELL_RE =
  /\b(as an ai|as a language model|large language model|i'?m an ai|i am an ai|i'?m claude|anthropic|openai|chatgpt|i hope this message finds you well|i cannot assist|i can't assist with that)\b/i;
const LEAK_RE = /(system prompt|my instructions (?:are|say)|<conversation>|tags=\[|language_hint)/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

/** Returns null if the reply is OK, else the rejection reason. */
export function validate(reply: string, persona: Persona): Rejection | null {
  if (!reply.trim()) return 'empty';
  if (reply.length > HARD_MAX) return 'too_long';
  if (PLACEHOLDER_RE.test(reply)) return 'placeholder';
  if (reply.includes(CANARY) || LEAK_RE.test(reply)) return 'prompt_leak';
  if (AI_TELL_RE.test(reply)) return 'ai_tell';
  const allowed = persona.facts.join(' ');
  const contacts = [...(reply.match(EMAIL_RE) ?? []), ...(reply.match(PHONE_RE) ?? [])];
  if (contacts.some((c) => !allowed.includes(c.trim()))) return 'contact_leak';
  return null;
}

type Lines = Record<'default' | 'image' | 'file' | 'audio' | 'short', string>;

const FALLBACKS: Record<string, Lines> = {
  en: {
    default: "Thanks for the message! Give me a bit and I'll get back to you properly.",
    image: "Thanks for sending this! I'll take a proper look shortly.",
    file: "Got it, thanks! I'll go through it and get back to you.",
    audio: "Can't listen right now, mind sending me the gist in text?",
    short: "Hey! What's up?",
  },
  fr: {
    default: 'Merci pour ton message ! Je te réponds plus en détail très vite.',
    image: "Merci de l'envoi ! Je regarde ça de plus près très vite.",
    file: 'Bien reçu, merci ! Je regarde et je reviens vers toi.',
    audio: "Je ne peux pas écouter là tout de suite, tu peux m'écrire l'essentiel ?",
    short: 'Salut ! Ça va ?',
  },
  es: {
    default: '¡Gracias por el mensaje! Dame un rato y te respondo bien.',
    image: '¡Gracias por enviarlo! Lo miro con calma en un rato.',
    file: '¡Recibido, gracias! Lo reviso y te digo.',
    audio: 'Ahora no puedo escucharlo, ¿me cuentas lo principal por escrito?',
    short: '¡Hola! ¿Qué tal?',
  },
  de: {
    default: 'Danke für die Nachricht! Ich melde mich gleich ausführlicher.',
    image: 'Danke fürs Schicken! Ich schaue es mir gleich genauer an.',
    file: 'Hab es bekommen, danke! Ich schaue rein und melde mich.',
    audio: 'Kann gerade nicht reinhören, schreibst du mir kurz das Wichtigste?',
    short: 'Hey! Was gibt’s?',
  },
  it: {
    default: 'Grazie per il messaggio! Dammi un attimo e ti rispondo per bene.',
    image: "Grazie per averlo mandato! Ci do un'occhiata a breve.",
    file: 'Ricevuto, grazie! Lo guardo e ti faccio sapere.',
    audio: 'Ora non riesco ad ascoltarlo, mi scrivi in breve?',
    short: 'Ciao! Come va?',
  },
  pt: {
    default: 'Obrigado pela mensagem! Já te respondo com calma.',
    image: 'Obrigado por enviar! Vou dar uma olhada com calma já já.',
    file: 'Recebido, obrigado! Vou ver e te retorno.',
    audio: 'Não consigo ouvir agora, pode me mandar o resumo por escrito?',
    short: 'Oi! Tudo bem?',
  },
  ar: {
    default: 'شكراً على رسالتك! سأرد عليك بالتفصيل قريباً.',
    image: 'شكراً على الإرسال! سألقي نظرة قريباً.',
    file: 'وصلني، شكراً! سأطلع عليه وأعود إليك.',
    audio: 'لا أستطيع الاستماع الآن، هل يمكنك كتابة الفكرة باختصار؟',
    short: 'أهلاً! كيف حالك؟',
  },
};

export function fallbackLine(cls: Classification): string {
  const lines = FALLBACKS[cls.language] ?? FALLBACKS.en!;
  if (cls.tags.has('audio') || cls.tags.has('video')) return lines.audio;
  if (cls.tags.has('image') || cls.tags.has('gif')) return lines.image;
  if (cls.tags.has('file')) return lines.file;
  if (cls.tags.has('nearly_empty') || cls.tags.has('emoji_only')) return lines.short;
  return lines.default;
}
