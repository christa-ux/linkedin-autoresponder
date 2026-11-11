import Anthropic from '@anthropic-ai/sdk';

export interface ImageInput {
  mediaType: 'image/png' | 'image/jpeg';
  data: string;
}

export interface LlmRequest {
  system: string;
  user: string;
  images?: ImageInput[];
}

export interface LlmProvider {
  generate(req: LlmRequest, opts: { fallback: boolean }): Promise<string>;
}

export class LlmError extends Error {}

const SUPPORTS_SERVER_FALLBACK = /^claude-(?:sonnet-5-5|opus-5|opus-5-5|fable-5)/;

export class AnthropicLlm implements LlmProvider {
  private readonly client: Anthropic;

  constructor(
    private readonly model: string,
    private readonly fallbackModel: string,
    timeoutMs: number,
    apiKey?: string,
  ) {
    // We retry on the fallback model ourselves, within the timeout budget.
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  }

  /** Cheap credentials check (no tokens): catches an expired login or missing credit before a message arrives. */
  async check(): Promise<void> {
    await this.client.models.retrieve(this.model);
  }

  async generate(req: LlmRequest, { fallback }: { fallback: boolean }): Promise<string> {
    const model = fallback ? this.fallbackModel : this.model;
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...(req.images ?? []).map(
        (img): Anthropic.Beta.BetaImageBlockParam => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data },
        }),
      ),
      { type: 'text', text: req.user },
    ];
    const serverFallback = SUPPORTS_SERVER_FALLBACK.test(model);
    const res = await this.client.beta.messages.create({
      model,
      max_tokens: 2000,
      // Low effort: short chat replies, lower latency.
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
      ...(serverFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    if (res.stop_reason === 'refusal') throw new LlmError(`refusal on ${model}`);
    const text = res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    if (!text) throw new LlmError(`empty completion from ${model} (stop_reason=${res.stop_reason})`);
    return text;
  }
}

export class MockLlm implements LlmProvider {
  public calls: Array<{ req: LlmRequest; fallback: boolean }> = [];
  constructor(private readonly impl: (req: LlmRequest, fallback: boolean) => string | Promise<string>) {}
  async generate(req: LlmRequest, { fallback }: { fallback: boolean }): Promise<string> {
    this.calls.push({ req, fallback });
    return this.impl(req, fallback);
  }
}
