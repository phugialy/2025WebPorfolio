import { generateOpenRouterText, getOpenRouterConfig } from "@/lib/openrouter";
import type { LLM, LLMResult, Message } from "@/social-agent/ports";

// OpenRouter-backed implementation of the `LLM` port (social-agent/ports.ts).
// Wraps lib/openrouter.ts's generateOpenRouterText, extended (this same
// change) to accept an optional per-call `model` override -- the Cost
// model section of docs/research/social-media-manager-agent.md requires
// different models for different pipeline steps (cheap for signal-scan/
// guardrail, mid-tier for strategist/writer, the existing article-tier
// model for the weekly retro), which the previous single-configured-model
// signature couldn't express. Every existing call site omits the new
// second argument and keeps using the resolved article model unchanged.
//
// OPENROUTER_SOCIAL_MODEL is this feature's own fallback default, separate
// from OPENROUTER_ARTICLE_MODEL -- Phase 2 pipeline steps are expected to
// pass their own per-call model via `opts.model` most of the time; this
// env var only matters when a caller doesn't specify one.
export function createOpenRouterLLM(): LLM {
  return {
    async generateText(messages: Message[], opts?: { model?: string }): Promise<LLMResult> {
      const model = opts?.model || process.env.OPENROUTER_SOCIAL_MODEL || getOpenRouterConfig().model;
      const result = await generateOpenRouterText(messages, { model });

      return {
        content: result.content,
        usage: result.usage
          ? {
              promptTokens: result.usage.prompt_tokens,
              completionTokens: result.usage.completion_tokens,
              totalTokens: result.usage.total_tokens,
            }
          : undefined,
      };
    },
  };
}
