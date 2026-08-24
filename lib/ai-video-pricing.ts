export type AiVideoModelKind = "video-generation" | "video-understanding";

export type AiVideoModelPricing = {
  id: string;
  name: string;
  provider: string;
  openRouterUrl: string;
  kind: AiVideoModelKind;
  inputModes: Array<"text" | "image" | "reference-image" | "video">;
  outputMode: "video" | "text";
  priceLabel: string;
  pricePerSecondUsd?: number;
  promptPricePerMillionTokensUsd?: number;
  completionPricePerMillionTokensUsd?: number;
  supportedResolutions?: string[];
  supportedAspectRatios?: string[];
  supportedDurations?: number[];
  supportedFrameImages?: Array<"first_frame" | "last_frame">;
  supportsAudio?: boolean | null;
  supportsSeed?: boolean | null;
  pricingSkus?: Record<string, string>;
  released?: string;
  notes: string;
};

type EstimateOptions = {
  durationSeconds: number;
  resolution?: string;
  withAudio?: boolean;
  hasImageInput?: boolean;
  aspectRatio?: string;
};

export const AI_VIDEO_MODEL_PRICING: AiVideoModelPricing[] = [
  {
    id: "x-ai/grok-imagine-video",
    name: "xAI: Grok Imagine Video",
    provider: "xAI",
    openRouterUrl: "https://openrouter.ai/x-ai/grok-imagine-video",
    kind: "video-generation",
    inputModes: ["text", "image", "reference-image"],
    outputMode: "video",
    priceLabel: "480p $0.05/s, 720p $0.07/s, image input $0.002/image",
    pricePerSecondUsd: 0.05,
    supportedResolutions: ["480p", "720p"],
    supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"],
    supportedDurations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    supportedFrameImages: ["first_frame"],
    supportsAudio: null,
    supportsSeed: null,
    pricingSkus: {
      cents_per_image_input: "0.2",
      cents_per_video_output_second_480p: "5",
      cents_per_video_output_second_720p: "7",
    },
    released: "May 18, 2026",
    notes: "Text-to-video, image-to-video, and reference-conditioned video. 1-15 seconds at 480p or 720p.",
  },
  {
    id: "kwaivgi/kling-v3.0-pro",
    name: "Kling: Video v3.0 Pro",
    provider: "Kuaishou",
    openRouterUrl: "https://openrouter.ai/kwaivgi/kling-v3.0-pro",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "$0.112/s, $0.168/s with audio",
    pricePerSecondUsd: 0.112,
    supportedResolutions: ["720p"],
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportedDurations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: false,
    pricingSkus: {
      duration_seconds: "0.112",
      duration_seconds_with_audio: "0.168",
    },
    released: "Apr 29, 2026",
    notes: "Premium text-to-video and image-to-video with first-frame and last-frame control.",
  },
  {
    id: "kwaivgi/kling-v3.0-std",
    name: "Kling: Video v3.0 Standard",
    provider: "Kuaishou",
    openRouterUrl: "https://openrouter.ai/kwaivgi/kling-v3.0-std",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "$0.084/s, $0.126/s with audio",
    pricePerSecondUsd: 0.084,
    supportedResolutions: ["720p"],
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportedDurations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: false,
    pricingSkus: {
      duration_seconds: "0.084",
      duration_seconds_with_audio: "0.126",
    },
    released: "Apr 29, 2026",
    notes: "Standard Kling text-to-video and image-to-video with frame control.",
  },
  {
    id: "google/veo-3.1-fast",
    name: "Google: Veo 3.1 Fast",
    provider: "Google",
    openRouterUrl: "https://openrouter.ai/google/veo-3.1-fast",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "720p from $0.08/s, 4K from $0.25/s",
    pricePerSecondUsd: 0.08,
    supportedResolutions: ["720p", "1080p", "4K"],
    supportedAspectRatios: ["16:9", "9:16"],
    supportedDurations: [4, 6, 8],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: {
      duration_seconds_without_audio_720p: "0.08",
      duration_seconds_with_audio_720p: "0.10",
      duration_seconds_without_audio: "0.10",
      duration_seconds_with_audio: "0.12",
      duration_seconds_without_audio_4k: "0.25",
      duration_seconds_with_audio_4k: "0.30",
    },
    notes: "Mid-tier Veo model balancing speed and quality with native synchronized audio.",
  },
  {
    id: "google/veo-3.1-lite",
    name: "Google: Veo 3.1 Lite",
    provider: "Google",
    openRouterUrl: "https://openrouter.ai/google/veo-3.1-lite",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "720p from $0.03/s, general from $0.05/s",
    pricePerSecondUsd: 0.03,
    supportedResolutions: ["720p", "1080p"],
    supportedAspectRatios: ["16:9", "9:16"],
    supportedDurations: [4, 6, 8],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: {
      duration_seconds_without_audio_720p: "0.03",
      duration_seconds_with_audio_720p: "0.05",
      duration_seconds_without_audio: "0.05",
      duration_seconds_with_audio: "0.08",
    },
    notes: "Cost-effective Veo model for rapid iteration and high-volume generation.",
  },
  {
    id: "kwaivgi/kling-video-o1",
    name: "Kling: Video O1",
    provider: "Kuaishou",
    openRouterUrl: "https://openrouter.ai/kwaivgi/kling-video-o1",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "$0.112/s",
    pricePerSecondUsd: 0.112,
    supportedResolutions: ["720p"],
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportedDurations: [5, 10],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: false,
    pricingSkus: { duration_seconds: "0.1120" },
    notes: "Cinematic Kling model for text and image inputs with video output.",
  },
  {
    id: "minimax/hailuo-2.3",
    name: "MiniMax: Hailuo 2.3",
    provider: "MiniMax",
    openRouterUrl: "https://openrouter.ai/minimax/hailuo-2.3",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "$0.0817/s",
    pricePerSecondUsd: 0.0817,
    supportedResolutions: ["1080p"],
    supportedAspectRatios: ["16:9"],
    supportedDurations: [6, 10],
    supportedFrameImages: ["first_frame"],
    supportsAudio: false,
    supportsSeed: null,
    pricingSkus: { duration_seconds: "0.0817" },
    notes: "MiniMax text-to-video and image-to-video model at 1080p.",
  },
  {
    id: "bytedance/seedance-2.0",
    name: "ByteDance: Seedance 2.0",
    provider: "ByteDance",
    openRouterUrl: "https://openrouter.ai/bytedance/seedance-2.0",
    kind: "video-generation",
    inputModes: ["text", "image", "reference-image"],
    outputMode: "video",
    priceLabel: "$7/M video tokens",
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedAspectRatios: ["1:1", "3:4", "9:16", "4:3", "16:9", "21:9", "9:21"],
    supportedDurations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: { video_tokens: "0.000007", video_tokens_without_audio: "0.000007" },
    notes: "Reference-friendly Seedance model strong at character consistency, style, and camera movement.",
  },
  {
    id: "bytedance/seedance-2.0-fast",
    name: "ByteDance: Seedance 2.0 Fast",
    provider: "ByteDance",
    openRouterUrl: "https://openrouter.ai/bytedance/seedance-2.0-fast",
    kind: "video-generation",
    inputModes: ["text", "image", "reference-image"],
    outputMode: "video",
    priceLabel: "$5.60/M video tokens, approx from $0.0538/s",
    pricePerSecondUsd: 0.0538,
    supportedResolutions: ["480p", "720p"],
    supportedAspectRatios: ["1:1", "3:4", "9:16", "4:3", "16:9", "21:9", "9:21"],
    supportedDurations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: { video_tokens: "0.0000056", video_tokens_without_audio: "0.0000056" },
    released: "Apr 15, 2026",
    notes: "Fast Seedance generation prioritizing speed and lower cost.",
  },
  {
    id: "alibaba/wan-2.7",
    name: "Alibaba: Wan 2.7",
    provider: "Alibaba",
    openRouterUrl: "https://openrouter.ai/alibaba/wan-2.7",
    kind: "video-generation",
    inputModes: ["text", "image", "reference-image"],
    outputMode: "video",
    priceLabel: "$0.10/s",
    pricePerSecondUsd: 0.1,
    supportedResolutions: ["720p", "1080p"],
    supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    supportedDurations: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: { duration_seconds: "0.1" },
    notes: "Text-to-video, image-to-video, and reference-to-video model from Alibaba.",
  },
  {
    id: "alibaba/wan-2.6",
    name: "Alibaba: Wan 2.6",
    provider: "Alibaba",
    openRouterUrl: "https://openrouter.ai/alibaba/wan-2.6",
    kind: "video-generation",
    inputModes: ["text", "image", "reference-image", "video"],
    outputMode: "video",
    priceLabel: "720p from $0.08/s text, $0.10/s image; 1080p up to $0.15/s",
    pricePerSecondUsd: 0.08,
    supportedResolutions: ["720p", "1080p"],
    supportedAspectRatios: ["16:9", "9:16"],
    supportedDurations: [5, 10],
    supportedFrameImages: ["first_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: {
      text_to_video_duration_seconds_480p: "0.04",
      text_to_video_duration_seconds_720p: "0.08",
      image_to_video_duration_seconds_720p: "0.10",
      text_to_video_duration_seconds_1080p: "0.12",
      image_to_video_duration_seconds_1080p: "0.15",
    },
    notes: "Advanced Wan system supporting text, images, reference videos, and audio-oriented workflows.",
  },
  {
    id: "bytedance/seedance-1-5-pro",
    name: "ByteDance: Seedance 1.5 Pro",
    provider: "ByteDance",
    openRouterUrl: "https://openrouter.ai/bytedance/seedance-1-5-pro",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "$2.40/M video tokens with audio, $1.20/M without audio",
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedAspectRatios: ["1:1", "3:4", "9:16", "9:21", "4:3", "16:9", "21:9"],
    supportedDurations: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: { video_tokens: "0.0000024", video_tokens_without_audio: "0.0000012" },
    notes: "Audio-visual Seedance model that generates video and audio in a unified pass.",
  },
  {
    id: "openai/sora-2-pro",
    name: "OpenAI: Sora 2 Pro",
    provider: "OpenAI",
    openRouterUrl: "https://openrouter.ai/openai/sora-2-pro",
    kind: "video-generation",
    inputModes: ["text"],
    outputMode: "video",
    priceLabel: "720p $0.30/s, 1080p $0.50/s",
    pricePerSecondUsd: 0.3,
    supportedResolutions: ["720p", "1080p"],
    supportedAspectRatios: ["16:9", "9:16"],
    supportedDurations: [4, 8, 12, 16, 20],
    supportsAudio: true,
    supportsSeed: false,
    pricingSkus: {
      duration_seconds_720p: "0.30",
      duration_seconds_1024p: "0.50",
      duration_seconds_1080p: "0.50",
    },
    notes: "Flagship production-quality video model with synchronized audio and world-state persistence.",
  },
  {
    id: "google/veo-3.1",
    name: "Google: Veo 3.1",
    provider: "Google",
    openRouterUrl: "https://openrouter.ai/google/veo-3.1",
    kind: "video-generation",
    inputModes: ["text", "image"],
    outputMode: "video",
    priceLabel: "from $0.20/s without audio, $0.40/s with audio; 4K higher",
    pricePerSecondUsd: 0.2,
    supportedResolutions: ["720p", "1080p", "4K"],
    supportedAspectRatios: ["16:9", "9:16"],
    supportedDurations: [4, 6, 8],
    supportedFrameImages: ["first_frame", "last_frame"],
    supportsAudio: true,
    supportsSeed: true,
    pricingSkus: {
      duration_seconds_without_audio: "0.20",
      duration_seconds_with_audio: "0.40",
      duration_seconds_without_audio_4k: "0.40",
      duration_seconds_with_audio_4k: "0.60",
    },
    notes: "State-of-the-art Veo model for final production cuts with native synchronized audio.",
  },
  {
    id: "minimax/minimax-m3",
    name: "MiniMax: MiniMax M3",
    provider: "MiniMax",
    openRouterUrl: "https://openrouter.ai/minimax/minimax-m3",
    kind: "video-understanding",
    inputModes: ["text", "image", "video"],
    outputMode: "text",
    priceLabel: "$0.30/M input, $1.20/M output",
    promptPricePerMillionTokensUsd: 0.3,
    completionPricePerMillionTokensUsd: 1.2,
    released: "May 31, 2026",
    notes: "Video input with text output. Useful for analyzing references, not generating video output.",
  },
];

export function getAiVideoModelPricing(modelId: string) {
  return AI_VIDEO_MODEL_PRICING.find((model) => model.id === modelId);
}

function getRateSkuCandidates(options: Omit<EstimateOptions, "durationSeconds">) {
  const resolution = options.resolution?.toLowerCase();
  const audio = options.withAudio;
  const hasImageInput = options.hasImageInput;

  return [
    hasImageInput && resolution ? `image_to_video_duration_seconds_${resolution}` : "",
    !hasImageInput && resolution ? `text_to_video_duration_seconds_${resolution}` : "",
    resolution ? `cents_per_video_output_second_${resolution}` : "",
    audio && resolution === "4k" ? "duration_seconds_with_audio_4k" : "",
    !audio && resolution === "4k" ? "duration_seconds_without_audio_4k" : "",
    audio && resolution ? `duration_seconds_with_audio_${resolution}` : "",
    !audio && resolution ? `duration_seconds_without_audio_${resolution}` : "",
    audio ? "duration_seconds_with_audio" : "",
    !audio ? "duration_seconds_without_audio" : "",
    resolution ? `duration_seconds_${resolution}` : "",
    "duration_seconds",
  ].filter(Boolean);
}

function normalizeRateFromSku(key: string, value: number) {
  if (key.startsWith("cents_per_video_output_second")) {
    return value / 100;
  }

  return value;
}

export function getEstimatedVideoRate(modelId: string, options: Omit<EstimateOptions, "durationSeconds">) {
  const model = getAiVideoModelPricing(modelId);

  if (!model || model.kind !== "video-generation") {
    return null;
  }

  for (const key of getRateSkuCandidates(options)) {
    const value = model.pricingSkus?.[key];
    if (value !== undefined) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return normalizeRateFromSku(key, parsed);
      }
    }
  }

  return model.pricePerSecondUsd ?? null;
}

export function getImageInputPrice(modelId: string) {
  const model = getAiVideoModelPricing(modelId);
  const cents = Number(model?.pricingSkus?.cents_per_image_input);

  if (!Number.isFinite(cents)) {
    return null;
  }

  return cents / 100;
}

export function getEstimatedVideoGenerationCost(modelId: string, options: EstimateOptions | number) {
  const normalizedOptions =
    typeof options === "number"
      ? { durationSeconds: options }
      : options;
  const rate = getEstimatedVideoRate(modelId, normalizedOptions);

  return rate === null ? null : rate * normalizedOptions.durationSeconds;
}

export function getModelCompatibilityIssues(
  modelId: string,
  options: {
    durationSeconds?: number;
    resolution: string;
    aspectRatio: string;
    withAudio: boolean;
    inputImagesCount: number;
    hasLastFrame?: boolean;
  },
) {
  const model = getAiVideoModelPricing(modelId);
  const issues: string[] = [];

  if (!model || model.kind !== "video-generation") {
    return issues;
  }

  if (
    options.durationSeconds !== undefined &&
    model.supportedDurations &&
    !model.supportedDurations.includes(options.durationSeconds)
  ) {
    issues.push(`Duration must be ${model.supportedDurations.join(", ")}s.`);
  }

  if (model.supportedResolutions && !model.supportedResolutions.includes(options.resolution)) {
    issues.push(`Resolution must be ${model.supportedResolutions.join(", ")}.`);
  }

  if (model.supportedAspectRatios && !model.supportedAspectRatios.includes(options.aspectRatio)) {
    issues.push(`Aspect must be ${model.supportedAspectRatios.join(", ")}.`);
  }

  if (options.withAudio && model.supportsAudio === false) {
    issues.push("Audio generation is not supported by this model.");
  }

  if (options.inputImagesCount > 0 && !model.inputModes.includes("image") && !model.inputModes.includes("reference-image")) {
    issues.push("Image input is not supported by this model.");
  }

  if (options.hasLastFrame && !model.supportedFrameImages?.includes("last_frame")) {
    issues.push("Last-frame control is not supported by this model.");
  }

  return issues;
}
