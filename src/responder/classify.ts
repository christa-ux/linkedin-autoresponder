import type { Classification, Tag, ThreadMessage } from '../types.js';
import { detectLanguage } from './language.js';

export const LONG_THRESHOLD = 1500;

const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Emoji_Component}‍️\s]+$/u;
const HAS_PICTO = /\p{Extended_Pictographic}/u;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|io|org|net|dev|co|ai|fr|app|ly|me)\/\S*/i;

// Hints only; the LLM makes the final call.
const RUDE_RE =
  /\b(idiot|stupid|dumb|moron|shut up|f+u+c+k+|wtf|stfu|loser|useless|trash|garbage|pathetic|scam(?:mer)?|connard|ta gueule|merde|putain|imbécile|idiota|estúpido|pendejo|mierda|gilipollas|arschloch|scheiße|vaffanculo)\b/i;
const INJECTION_RE =
  /(ignore (?:all |any |the )?(?:previous|prior|above|earlier) (?:instructions|prompts?|messages?)|disregard (?:your|the) (?:instructions|rules)|system prompt|your (?:instructions|prompt|rules)\b.*\b(?:print|show|reveal|repeat|tell)|(?:print|reveal|show|repeat) (?:me )?your (?:system )?(?:prompt|instructions)|you are now\b|act as (?:an?|my)\b|developer mode|jailbreak|\bDAN\b|oublie (?:toutes )?(?:tes|les) instructions|ignora (?:las )?instrucciones)/i;
const BOT_RE =
  /(are you (?:a |an )?(?:bot|robot|ai|a\.i\.|human|real(?: person)?)|is this (?:a )?(?:bot|automated|ai)|am i (?:talking|chatting|speaking) (?:to|with) (?:a )?(?:bot|ai|human|real)|chat ?gpt|\bllm\b|es[- ]tu un (?:bot|robot)|êtes[- ]vous un (?:bot|robot)|c'est un (?:bot|robot)|eres un (?:bot|robot)|bist du ein (?:bot|roboter))/i;
const CONTACT_RE =
  /(phone|number|whats ?app|telegram|signal|e-?mail|address|adresse|numéro|téléphone|correo|teléfono|telefon)\b.*\?|\b(?:send|give|share) me your (?:phone|number|email|address)/i;
const MEETING_RE =
  /\b(call|meeting|meet|coffee|zoom|teams|google meet|calendly|catch up|hop on|chat (?:this|next|tomorrow|today)|available|availability|appel|réunion|rendez-vous|café|dispo(?:nible)?|llamada|reunión|treffen|termin)\b/i;
const THANKS_BYE_RE =
  /^(?:thanks?|thank you|thx|ty|cheers|merci(?: beaucoup)?|gracias|danke|grazie|obrigad[oa]|bye|goodbye|see you|see ya|talk soon|ttyl|later|ciao|à plus|a\+|bonne (?:journée|soirée)|have a (?:good|great|nice) (?:day|one|week(?:end)?)|ok(?:ay)?(?: thanks?)?|perfect|great|cool|awesome|noted|got it)[\s!.,🙂😊🙏👍👋❤️]*$/iu;
const CODE_RE = /```|^\s*(?:const|let|function|def|class|import|SELECT|<\/?\w+>)\b|[{};]\s*$/m;

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && EMOJI_ONLY.test(t) && HAS_PICTO.test(t);
}

export function isNearlyEmpty(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (isEmojiOnly(t)) return false;
  const letters = t.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return t.length <= 3 || letters === 0;
}

export function classify(burst: ThreadMessage[]): Classification {
  const tags = new Set<Tag>();
  const texts = burst.map((m) => m.text.trim()).filter(Boolean);
  const text = texts.join('\n');
  const attachments = burst.flatMap((m) => m.attachments);

  if (burst.length > 1) tags.add('multi');
  const norm = texts.map(normalize);
  if (norm.length > 1 && new Set(norm).size < norm.length) tags.add('repeated');

  if (attachments.length === 0 && isNearlyEmpty(text)) tags.add('nearly_empty');
  if (isEmojiOnly(text)) tags.add('emoji_only');
  if (text.length > LONG_THRESHOLD) tags.add('long');
  if (burst.some((m) => m.links.length > 0) || URL_RE.test(text)) tags.add('link');

  for (const a of attachments) {
    if (a.kind === 'image') tags.add('image');
    else if (a.kind === 'gif' || a.kind === 'sticker') tags.add('gif');
    else if (a.kind === 'file') tags.add('file');
    else if (a.kind === 'audio') tags.add('audio');
    else if (a.kind === 'video') tags.add('video');
  }

  if (RUDE_RE.test(text)) tags.add('rude');
  if (INJECTION_RE.test(text)) tags.add('injection');
  if (BOT_RE.test(text)) tags.add('bot_question');
  if (CONTACT_RE.test(text)) tags.add('contact_request');
  if (MEETING_RE.test(text)) tags.add('meeting_request');
  const last = texts.at(-1) ?? '';
  if (last && THANKS_BYE_RE.test(last)) tags.add('thanks_bye');
  if (CODE_RE.test(text)) tags.add('code');
  const letters = text.match(/\p{L}/gu) ?? [];
  const upper = text.match(/\p{Lu}/gu) ?? [];
  if (letters.length >= 10 && upper.length / letters.length > 0.8) tags.add('all_caps');

  // Mixed languages: the last message wins.
  let language = detectLanguage(last);
  if (language === 'und') language = detectLanguage(text);
  if (language !== 'en' && language !== 'und') tags.add('non_english');

  return { tags, language, text };
}
