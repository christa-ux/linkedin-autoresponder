import type { Config } from '../config.js';

export interface Persona {
  name: string;
  firstName: string;
  headline: string;
  facts: string[];
}

export function buildPersona(cfg: Pick<Config, 'PERSONA_NAME' | 'PERSONA_HEADLINE' | 'PERSONA_FACTS'>, linkedInName?: string): Persona {
  const name = cfg.PERSONA_NAME.trim() || linkedInName?.trim() || 'me';
  return {
    name,
    firstName: name.split(/\s+/)[0] ?? name,
    headline: cfg.PERSONA_HEADLINE.trim(),
    facts: cfg.PERSONA_FACTS.split(/[;\n]/).map((f) => f.trim()).filter(Boolean),
  };
}
