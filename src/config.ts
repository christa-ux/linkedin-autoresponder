import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('claude-sonnet-5-5'),
  LLM_FALLBACK_MODEL: z.string().default('claude-haiku-5-5'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),

  HEADLESS: bool,
  USER_DATA_DIR: z.string().default('./user-data'),

  INVITES_POLL_SECONDS: z.coerce.number().positive().default(20),
  MESSAGES_POLL_SECONDS: z.coerce.number().positive().default(6),
  BURST_SETTLE_MS: z.coerce.number().int().nonnegative().default(5000),
  BURST_MAX_WAIT_MS: z.coerce.number().int().positive().default(15000),
  MAX_TYPING_MS: z.coerce.number().int().nonnegative().default(3000),

  DB_PATH: z.string().default('./data/bot.db'),
  LOG_CONTENT: bool,
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'silent']).default('info'),
  DRY_RUN: bool,

  PERSONA_NAME: z.string().default(''),
  PERSONA_HEADLINE: z.string().default(''),
  PERSONA_FACTS: z.string().default(''),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    // Fail fast with a readable message; never print values (they may be secrets).
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}

export const config = loadConfig();
