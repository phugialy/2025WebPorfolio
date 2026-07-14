type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterCompletion = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{
        type?: string;
        image_url?: {
          url?: string;
        };
        imageUrl?: {
          url?: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type OpenRouterResult = {
  content: string;
  id?: string;
  model?: string;
  usage?: OpenRouterCompletion["usage"];
};

export function getOpenRouterConfig() {
  return {
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    model:
      process.env.OPENROUTER_ARTICLE_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "anthropic/claude-3.5-sonnet",
    siteUrl: process.env.OPENROUTER_SITE_URL || process.env.NEXTAUTH_URL || "https://www.phugialy.com",
    appTitle: process.env.OPENROUTER_APP_TITLE || "Phu Gia Ly Portfolio",
    // A 1200-1800 word article alone is ~1600-2400 tokens before counting the
    // JSON scaffolding and the other ~20 metadata fields requested in the same
    // response (deliveryNote, qualityScores, evidenceUse) - the old default of
    // 2400 left near-zero headroom and was cutting responses off mid-generation
    // on longer articles (confirmed live: a real published article's content
    // was the raw, truncated model response instead of a finished draft).
    maxTokens: Number(process.env.OPENROUTER_ARTICLE_MAX_TOKENS || 6000),
    temperature: Number(process.env.OPENROUTER_ARTICLE_TEMPERATURE || 0.65),
  };
}

export function getOpenRouterImageConfig() {
  return {
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    model: process.env.OPENROUTER_IMAGE_MODEL || "x-ai/grok-imagine-image-quality",
    siteUrl: process.env.OPENROUTER_SITE_URL || process.env.NEXTAUTH_URL || "https://www.phugialy.com",
    appTitle: process.env.OPENROUTER_APP_TITLE || "Phu Gia Ly Portfolio",
    aspectRatio: process.env.OPENROUTER_IMAGE_ASPECT_RATIO || "16:9",
    imageSize: process.env.OPENROUTER_IMAGE_SIZE || "1K",
    maxImagesPerRun: Number(process.env.OPENROUTER_IMAGE_MAX_PER_RUN || 3),
  };
}

export async function generateOpenRouterText(messages: OpenRouterMessage[]) {
  const config = getOpenRouterConfig();

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteUrl,
      "X-OpenRouter-Title": config.appTitle,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${body.slice(0, 500)}`);
  }

  const completion = (await response.json()) as OpenRouterCompletion;
  const content = completion.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter response did not include generated text");
  }

  return {
    content,
    id: completion.id,
    model: completion.model,
    usage: completion.usage,
  } satisfies OpenRouterResult;
}

export async function generateOpenRouterImage(prompt: string) {
  const config = getOpenRouterImageConfig();

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteUrl,
      "X-OpenRouter-Title": config.appTitle,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image"],
      stream: false,
      image_config: {
        aspect_ratio: config.aspectRatio,
        image_size: config.imageSize,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter image request failed: ${response.status} ${body.slice(0, 500)}`);
  }

  const completion = (await response.json()) as OpenRouterCompletion;
  const message = completion.choices?.[0]?.message;
  const image = message?.images?.[0];
  const dataUrl = image?.image_url?.url || image?.imageUrl?.url;

  if (!dataUrl) {
    throw new Error("OpenRouter image response did not include an image data URL");
  }

  return {
    dataUrl,
    id: completion.id,
    model: completion.model || config.model,
    usage: completion.usage,
  };
}
