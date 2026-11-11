/** Rough hint for fallback lines; the LLM mirrors the language itself. */
const SCRIPTS: Array<[RegExp, string]> = [
  [/[؀-ۿ]/u, 'ar'],
  [/[֐-׿]/u, 'he'],
  [/[Ѐ-ӿ]/u, 'ru'],
  [/[぀-ヿ]/u, 'ja'],
  [/[가-힯]/u, 'ko'],
  [/[一-鿿]/u, 'zh'],
  [/[ऀ-ॿ]/u, 'hi'],
  [/[Ͱ-Ͽ]/u, 'el'],
  [/[฀-๿]/u, 'th'],
];

const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'and', 'you', 'is', 'are', 'what', 'how', 'hi', 'hey', 'hello', 'thanks', 'i', 'my', 'to', 'do', 'it', 'for', 'can', 'your', 'this'],
  fr: ['le', 'la', 'les', 'et', 'est', 'vous', 'tu', 'je', 'bonjour', 'salut', 'merci', 'ça', 'va', 'pour', 'avec', 'une', 'des', 'pas', 'que', 'qui', 'comment', 'oui', 'suis'],
  es: ['el', 'los', 'las', 'es', 'usted', 'tú', 'yo', 'hola', 'gracias', 'qué', 'cómo', 'para', 'con', 'una', 'por', 'pero', 'muy', 'estás', 'buenos'],
  de: ['der', 'die', 'das', 'und', 'ist', 'sie', 'du', 'ich', 'hallo', 'danke', 'wie', 'nicht', 'mit', 'für', 'ein', 'eine', 'guten', 'geht'],
  it: ['il', 'gli', 'sei', 'io', 'ciao', 'grazie', 'come', 'per', 'con', 'una', 'che', 'non', 'stai', 'buongiorno'],
  pt: ['os', 'você', 'eu', 'olá', 'oi', 'obrigado', 'obrigada', 'como', 'para', 'com', 'uma', 'não', 'tudo', 'bem'],
  nl: ['de', 'het', 'en', 'is', 'jij', 'je', 'ik', 'hallo', 'hoi', 'dank', 'hoe', 'niet', 'met', 'voor', 'een', 'gaat'],
};

export function detectLanguage(text: string): string {
  for (const [re, code] of SCRIPTS) if (re.test(text)) return code;
  const clean = text.replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, ' ');
  const words = clean.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length === 0) return 'und';
  let best = 'en';
  let bestScore = 0;
  for (const [lang, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list);
    const score = words.filter((w) => set.has(w)).length;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  if (bestScore === 0) {
    if (/[çàèùâêîôûœ]/i.test(clean)) return 'fr';
    if (/[ñ¿¡]/i.test(clean)) return 'es';
    if (/[äöüß]/i.test(clean)) return 'de';
    return 'und';
  }
  return best;
}
