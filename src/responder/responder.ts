import { logger } from '../logger.js';
import type { Classification, Thread, ThreadMessage } from '../types.js';
import { classify } from './classify.js';
import { fallbackLine, validate } from './guardrails.js';
import type { ImageInput, LlmProvider } from './llm.js';
import type { Persona } from './persona.js';
import { postprocess } from './postprocess.js';
import { systemPrompt, userPrompt } from './prompt.js';

export interface Reply {
  text: string;
  source: 'llm' | 'llm_fallback_model' | 'fallback_line';
  classification: Classification;
}

export interface RespondInput {
  thread: Thread;
  burst: ThreadMessage[];
  images?: ImageInput[];
  rudeCount?: number;
}

/** Never throws: if both models fail, it returns a canned fallback line. */
export class Responder {
  private readonly system: string;

  constructor(
    private readonly llm: LlmProvider,
    private readonly persona: Persona,
  ) {
    this.system = systemPrompt(persona);
  }

  async respond({ thread, burst, images = [], rudeCount = 0 }: RespondInput): Promise<Reply> {
    const cls = classify(burst);
    const notes: string[] = [];
    if (cls.tags.has('rude') && rudeCount > 0) notes.push('They have been rude before in this thread. Stay calm, keep it to one short sentence.');
    if ((cls.tags.has('image') || cls.tags.has('gif')) && images.length === 0) {
      notes.push("The picture couldn't be loaded, so don't describe it; just thank them and say you'll look properly shortly.");
    }
    const user = userPrompt(thread, cls, notes);

    for (const fallback of [false, true]) {
      try {
        const raw = await this.llm.generate({ system: this.system, user, images }, { fallback });
        const text = postprocess(raw);
        const rejection = validate(text, this.persona);
        if (!rejection) return { text, source: fallback ? 'llm_fallback_model' : 'llm', classification: cls };
        logger.warn({ rejection, fallback }, 'LLM reply rejected by guardrails');
      } catch (err) {
        logger.warn({ err: (err as Error).message, fallback }, 'LLM call failed');
      }
    }
    return { text: fallbackLine(cls), source: 'fallback_line', classification: cls };
  }
}
