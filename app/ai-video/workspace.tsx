"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Aperture,
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clapperboard,
  Copy,
  Download,
  FileText,
  FolderOpen,
  History,
  ImagePlus,
  KeyRound,
  Layers,
  Link2,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Reply,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AI_VIDEO_MODEL_PRICING,
  getAiVideoModelPricing,
  getEstimatedVideoGenerationCost,
  getEstimatedVideoRate,
  getImageInputPrice,
  getModelCompatibilityIssues,
} from "@/lib/ai-video-pricing";

type JobStatus = "draft" | "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired";
type MessageRole = "system" | "user" | "assistant";
type AssetKind = "video" | "image" | "audio" | "logo" | "generated";
type WorkspaceTab = "assets" | "timeline" | "export";

type MediaAsset = {
  id: string;
  name: string;
  kind: AssetKind;
  url: string;
  source: "import" | "generated" | "external";
  createdAt: string;
  linkedJobId?: string;
};

type TimelineClip = {
  id: string;
  assetId: string;
  name: string;
  kind: AssetKind;
  track: "video" | "audio" | "overlay" | "title";
  start: number;
  end: number;
};

type LocalProject = {
  id: string;
  name: string;
  outputFolder: string;
  assets: MediaAsset[];
  timeline: TimelineClip[];
  exportFormat: "mp4" | "mov" | "webm";
  createdAt: string;
  updatedAt: string;
};

type VideoJob = {
  id: string;
  providerJobId?: string;
  generationId?: string;
  pollingUrl?: string;
  status: JobStatus;
  model: string;
  prompt: string;
  finalPrompt: string;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
  localSourceUrl?: string;
  localPreviewUrl?: string;
  cacheStatus?: "idle" | "caching" | "ready" | "failed";
  cacheError?: string;
  error?: string;
  cost?: number;
  inputImages: InputImage[];
  referencedVideoId?: string;
  referencedVideoUrl?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  jobs: VideoJob[];
};

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  videoJobId?: string;
};

type InputImage = {
  id: string;
  url: string;
  label: string;
  mode: "first_frame" | "last_frame" | "reference";
};

type OpenRouterJobResponse = {
  id?: string;
  polling_url?: string;
  status?: JobStatus;
  generation_id?: string;
  unsigned_urls?: string[];
  error?: unknown;
  message?: unknown;
  usage?: {
    cost?: number;
  };
};

type CacheOutputResponse = {
  sourceUrl?: string;
  previewUrl?: string;
  metadata?: unknown;
  error?: unknown;
};

type UploadReferenceResponse = {
  publicUrl?: string;
  path?: string;
  error?: unknown;
};

const STORAGE_KEY = "phu-ai-video-workspace";
const KEY_STORAGE_KEY = "phu-ai-video-openrouter-key";
const DEFAULT_OUTPUT_FOLDER = "~/Movies/AI Video Studio/Exports";
const VENDOR_PROMPT_MAX_CHARS = 3900;

const MODEL_OPTIONS = AI_VIDEO_MODEL_PRICING.filter((model) => model.kind === "video-generation");
const VIDEO_ANALYSIS_MODELS = AI_VIDEO_MODEL_PRICING.filter((model) => model.kind === "video-understanding");

type ProductTagContract = {
  id: string;
  category: CreativeControlCategory;
  label: string;
  definition: string;
  whenToUse: string;
  skills: string[];
  promptContract: string[];
  guardrails: string[];
};

type CreativeControlCategory = "purpose" | "style" | "shotFocus" | "motionEdit" | "referenceBehavior";
type CreativeControlSelections = Record<CreativeControlCategory, string>;

const CREATIVE_CONTROL_CATEGORIES: Array<{ id: CreativeControlCategory; label: string }> = [
  { id: "purpose", label: "Purpose" },
  { id: "style", label: "Style" },
  { id: "shotFocus", label: "Shot Focus" },
  { id: "motionEdit", label: "Motion / Edit" },
  { id: "referenceBehavior", label: "Reference Behavior" },
];

const AUTO_CONTROL_ID = "auto";

const PRODUCT_TAG_CONTRACTS: ProductTagContract[] = [
  {
    id: "product-demo",
    category: "purpose",
    label: "Product Demo",
    definition: "A product-forward clip that makes an object, feature, or offer easy to understand quickly.",
    whenToUse: "Use when the output needs to sell, explain, compare, reveal, or demonstrate a product or service.",
    skills: ["product readability", "material detail", "scale cues", "use-case staging", "clean end frame"],
    promptContract: [
      "Make the product or service the visual priority.",
      "Show material, scale, usage, or benefit clearly.",
      "End on a clean product-facing frame that could be used in an edit.",
    ],
    guardrails: ["Do not bury the product in atmosphere.", "Do not make the camera movement more important than clarity."],
  },
  {
    id: "social-ad",
    category: "purpose",
    label: "Social Ad",
    definition: "A short-form attention clip optimized for feeds, hooks, and quick comprehension.",
    whenToUse: "Use for ads, reels, TikToks, launch snippets, promo teasers, and fast creative tests.",
    skills: ["first-two-second hook", "feed readability", "simple motion", "short-form pacing", "memorable ending"],
    promptContract: [
      "Prioritize a strong opening moment.",
      "Keep the action simple enough to read on a small screen.",
      "Use a clear ending beat that feels complete.",
    ],
    guardrails: ["Do not overload the shot with too many ideas.", "Avoid tiny details that only work on a large screen."],
  },
  {
    id: "cinematic-scene",
    category: "style",
    label: "Cinematic Scene",
    definition: "A scene-led clip that feels directed, lit, blocked, and framed like a film moment.",
    whenToUse: "Use for narrative shots, atmospheric worlds, mood pieces, trailers, and cinematic product context.",
    skills: ["motivated lighting", "lens-aware camera", "scene blocking", "depth layers", "atmosphere"],
    promptContract: [
      "Use coherent foreground, midground, and background separation.",
      "Describe camera perspective and movement with intention.",
      "Make lighting feel motivated by the scene.",
    ],
    guardrails: ["Do not let style replace subject clarity.", "Avoid random camera motion that breaks continuity."],
  },
  {
    id: "character-shot",
    category: "shotFocus",
    label: "Character Shot",
    definition: "A character-centered clip where identity, pose, expression, and movement continuity matter.",
    whenToUse: "Use for people, mascots, avatars, actors, influencers, animated characters, or recurring brand figures.",
    skills: ["identity consistency", "readable silhouette", "expressive pose", "natural timing", "face/body stability"],
    promptContract: [
      "Preserve character identity and recognizable details.",
      "Keep pose and movement readable.",
      "Use expression and body language to communicate intent.",
    ],
    guardrails: ["Avoid sudden costume, face, or body changes.", "Do not create ambiguous extra characters unless requested."],
  },
  {
    id: "animation-loop",
    category: "motionEdit",
    label: "Animation Loop",
    definition: "A repeatable motion clip that can loop cleanly or become a background/social asset.",
    whenToUse: "Use for animated posts, UI motion, ambient loops, motion graphics, stickers, and looping product moments.",
    skills: ["motion arcs", "repeatable timing", "stable framing", "silhouette clarity", "loopable ending"],
    promptContract: [
      "Use a repeatable action or camera move.",
      "Keep the first and last moments visually compatible.",
      "Favor clean motion arcs over complex event changes.",
    ],
    guardrails: ["Avoid irreversible scene changes unless requested.", "Do not rely on a hard narrative ending."],
  },
  {
    id: "transition",
    category: "motionEdit",
    label: "Transition",
    definition: "A clip designed to bridge shots, scenes, products, angles, or states in an edit.",
    whenToUse: "Use for before/after, scene changes, product reveals, match cuts, wipes, and montage bridges.",
    skills: ["edit points", "motion bridge", "first-frame clarity", "final-frame clarity", "visual continuity"],
    promptContract: [
      "Make the start and end frames edit-friendly.",
      "Use a clear motion bridge between states.",
      "Reduce clutter at the cut points.",
    ],
    guardrails: ["Do not make the transition so busy that the edit point is unusable.", "Avoid unclear start/end states."],
  },
  {
    id: "logo-title",
    category: "purpose",
    label: "Logo / Title",
    definition: "A title-card or brand-mark clip where legibility and final-frame polish are the priority.",
    whenToUse: "Use for logos, titles, end cards, intro cards, reveal moments, and branded separators.",
    skills: ["legibility", "brand mark priority", "centered reveal", "negative space", "title-card ending"],
    promptContract: [
      "Keep the mark, title, or visual identity legible.",
      "Use simple movement that supports the reveal.",
      "End on a stable frame that can be used as a title card.",
    ],
    guardrails: ["Avoid generating small unreadable text.", "Do not add unnecessary visual noise behind the mark."],
  },
  {
    id: "style-reference",
    category: "referenceBehavior",
    label: "Style Match",
    definition: "A reference-led clip that should preserve palette, texture, visual language, or brand art direction.",
    whenToUse: "Use when images, previous videos, or brand examples should guide the look and continuity.",
    skills: ["palette matching", "texture continuity", "art direction", "reference discipline", "consistency"],
    promptContract: [
      "Use references for palette, texture, framing, and art direction.",
      "Preserve the useful visual language from references.",
      "Adapt the style to the new prompt without copying unwanted artifacts.",
    ],
    guardrails: ["Do not overfit to reference flaws.", "Do not ignore the user's new subject or action request."],
  },
];

const SKILL_SYSTEM_PROMPTS = [
  "Video generation skill: describe clear subject motion, frame continuity, render texture, temporal stability, lighting behavior, and camera movement.",
  "Producer perspective skill: clarify story intent, focal hierarchy, scene economy, blocking, and what the audience should understand quickly.",
  "Taste direction skill: refine toward elegant composition, tactile detail, confident restraint, natural contrast, and less generic output.",
  "Cinematic scene skill: specify camera perspective, lens feel, foreground/midground/background separation, atmosphere, and ending frame.",
];

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    if (typeof record.error === "string") {
      return record.error;
    }

    if (record.error && typeof record.error === "object") {
      return getErrorMessage(record.error, fallback);
    }

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.detail === "string") {
      return record.detail;
    }
  }

  return fallback;
}

function isPublicHttpsUrl(url: string) {
  return /^https:\/\/.+/i.test(url) && !url.startsWith("https://localhost") && !url.startsWith("https://127.0.0.1");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function inferDurationFromPrompt(prompt: string) {
  const match = prompt.match(/\b(\d{1,2})\s*(?:s|sec|secs|second|seconds)\b/i);
  const duration = match ? Number(match[1]) : null;

  return duration && Number.isInteger(duration) && duration > 0 ? duration : undefined;
}

function createProject(): LocalProject {
  const createdAt = now();

  return {
    id: makeId("project"),
    name: "Local AI Video Project",
    outputFolder: DEFAULT_OUTPUT_FOLDER,
    assets: [],
    timeline: [],
    exportFormat: "mp4",
    createdAt,
    updatedAt: createdAt,
  };
}

function createConversation(): Conversation {
  const createdAt = now();

  return {
    id: makeId("conversation"),
    title: "Untitled video scene",
    createdAt,
    updatedAt: createdAt,
    jobs: [],
    messages: [
      {
        id: makeId("message"),
        role: "system",
        createdAt,
        content:
          "Creative skill system is ready. The app will map selected tags and prompt context into hidden video-generation guidance before each run.",
      },
    ],
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDownloadUrl(job: VideoJob) {
  if (job.localSourceUrl) {
    return job.localSourceUrl;
  }

  if (!job.videoUrl) {
    return "";
  }

  return `/api/ai-video/download?url=${encodeURIComponent(job.videoUrl)}&name=${encodeURIComponent(`${job.id}.mp4`)}`;
}

function getStreamUrl(job: VideoJob) {
  if (job.localPreviewUrl || job.localSourceUrl) {
    return job.localPreviewUrl || job.localSourceUrl || "";
  }

  if (!job.videoUrl) {
    return "";
  }

  return `/api/ai-video/stream?url=${encodeURIComponent(job.videoUrl)}`;
}

function getCompatStreamUrl(job: VideoJob) {
  if (!job.videoUrl) {
    return "";
  }

  return `/api/ai-video/compat-stream?url=${encodeURIComponent(job.videoUrl)}`;
}

function getVideoDeliveryType(url?: string) {
  if (!url) {
    return "unknown";
  }

  const normalizedUrl = url.split("?")[0].toLowerCase();

  if (normalizedUrl.endsWith(".m3u8")) {
    return "hls";
  }

  if (normalizedUrl.endsWith(".mpd")) {
    return "dash";
  }

  return "file";
}

type PromptPackageFormat = {
  model: string;
  modelName?: string;
  aspectRatio: string;
  resolution: string;
  duration?: number;
  generateAudio: boolean;
  imageCount: number;
  rateLabel?: string;
  estimatedRate?: number | null;
};

type VideoGenerationJobContract = {
  userPrompt: string;
  workspaceSettings: {
    model: string;
    modelName?: string;
    aspectRatio: string;
    resolution: string;
    duration?: number;
    audioIntent: "none" | "generate-if-supported";
    priceExpectation: string;
  };
  creativeControls: {
    selections: CreativeControlSelections;
    selectedTagIds: string[];
    selectedTags: ProductTagContract[];
  };
  references: {
    imageCount: number;
    referencedVideo?: {
      id: string;
      providerJobId?: string;
      prompt: string;
      videoUrl?: string;
    };
  };
  memory: string[];
};

const SYSTEM_IMPACT_LAYER = {
  interpretationRules: [
    "Infer missing creative details from the user prompt and references instead of asking extra questions.",
    "Leave unspecified creative controls on Auto and avoid over-constraining the generation.",
    "If the user prompt conflicts with workspace settings, workspace settings win.",
    "Favor one clear shot, one primary subject, one main action, and one camera move.",
  ],
  promptAnatomy: ["Subject", "Scene", "Action", "Camera", "Motion", "Lighting / Style", "Timing", "Final Frame", "Avoid"],
  referenceRules: [
    "When references are attached, treat them as visual anchors rather than re-inventing the scene from scratch.",
    "For image-to-video, describe what moves, what stays stable, and how the camera behaves.",
    "For referenced prior videos, preserve continuity only where useful; improve pacing, taste, and clarity.",
  ],
  qualityRules: [
    "Protect the user from overloaded prompts by compressing many requests into the strongest single-shot interpretation.",
    "Make the output usable for editing by prioritizing clear motion and a stable final frame.",
  ],
};

function createVideoGenerationJobContract(
  prompt: string,
  conversation: Conversation,
  selectedTagIds: string[],
  format: PromptPackageFormat,
  referencedVideo?: VideoJob,
): VideoGenerationJobContract {
  const selectedTags = PRODUCT_TAG_CONTRACTS.filter((tag) => selectedTagIds.includes(tag.id));
  const memory = conversation.messages
    .filter((message) => message.role !== "system")
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`);

  return {
    userPrompt: prompt,
    workspaceSettings: {
      model: format.model,
      modelName: format.modelName,
      aspectRatio: format.aspectRatio,
      resolution: format.resolution,
      duration: format.duration,
      audioIntent: format.generateAudio ? "generate-if-supported" : "none",
      priceExpectation:
        format.estimatedRate !== null && format.estimatedRate !== undefined
          ? `$${format.estimatedRate.toFixed(3)}/s`
          : format.rateLabel || "vendor/model dependent",
    },
    creativeControls: {
      selections: Object.fromEntries(
        CREATIVE_CONTROL_CATEGORIES.map((category) => [
          category.id,
          selectedTagIds.includes(
            PRODUCT_TAG_CONTRACTS.find((tag) => tag.category === category.id && selectedTagIds.includes(tag.id))?.id || "",
          )
            ? PRODUCT_TAG_CONTRACTS.find((tag) => tag.category === category.id && selectedTagIds.includes(tag.id))?.id || AUTO_CONTROL_ID
            : AUTO_CONTROL_ID,
        ]),
      ) as CreativeControlSelections,
      selectedTagIds,
      selectedTags,
    },
    references: {
      imageCount: format.imageCount,
      referencedVideo: referencedVideo
        ? {
            id: referencedVideo.id,
            providerJobId: referencedVideo.providerJobId,
            prompt: referencedVideo.prompt,
            videoUrl: referencedVideo.videoUrl,
          }
        : undefined,
    },
    memory,
  };
}

function getGenerationMode(contract: VideoGenerationJobContract) {
  if (contract.references.referencedVideo?.videoUrl) {
    return "referenced-video-edit";
  }

  if (contract.references.imageCount > 0) {
    return "reference-guided-image-to-video";
  }

  return "text-to-video";
}

function compileVendorPrompt(contract: VideoGenerationJobContract) {
  const selectedTags = contract.creativeControls.selectedTags;
  const controlSummary = CREATIVE_CONTROL_CATEGORIES.map((category) => {
    const selectedId = contract.creativeControls.selections[category.id];
    const selectedTag = PRODUCT_TAG_CONTRACTS.find((tag) => tag.id === selectedId);

    return `${category.label}: ${selectedTag ? selectedTag.label : "Auto"}`;
  });
  const controlDirections = selectedTags.flatMap((tag) => tag.promptContract.slice(0, 2));
  const guardrails = selectedTags.flatMap((tag) => tag.guardrails.slice(0, 1));
  const memory = contract.memory.slice(-2).map((item) => truncateText(item, 180));
  const systemImpact = [
    ...SKILL_SYSTEM_PROMPTS.map((skill) => truncateText(skill, 120)),
    ...SYSTEM_IMPACT_LAYER.qualityRules.map((rule) => truncateText(rule, 120)),
  ];
  const generationMode = getGenerationMode(contract);
  const referenceDirection = contract.references.referencedVideo?.videoUrl
    ? [
        `Continue/edit from referenced video: ${truncateText(contract.references.referencedVideo.prompt, 220)}`,
        "Preserve useful continuity, but improve pacing, clarity, camera intention, and final-frame polish.",
      ]
    : contract.references.imageCount > 0
      ? [
          "Use attached reference imagery as the visual anchor.",
          "Describe motion evolution only: what moves, what stays stable, and how the camera behaves.",
        ]
      : ["No reference assets. Generate from the text prompt."];

  const prompt = [
    "VIDEO GENERATION BRIEF",
    `Scene request: ${truncateText(contract.userPrompt, 900)}`,
    "",
    `Format: ${contract.workspaceSettings.aspectRatio}, ${contract.workspaceSettings.resolution}, ${
      contract.workspaceSettings.duration ? `${contract.workspaceSettings.duration}s` : "model-default duration"
    }, audio ${contract.workspaceSettings.audioIntent === "generate-if-supported" ? "if supported" : "off"}.`,
    `Mode: ${generationMode}.`,
    `Controls: ${controlSummary.join("; ")}.`,
    "",
    "Reference handling:",
    ...referenceDirection.map((rule) => `- ${rule}`),
    "",
    "Creative direction:",
    ...systemImpact.map((rule) => `- ${rule}`),
    ...(controlDirections.length > 0
      ? controlDirections.map((rule) => `- ${rule}`)
      : ["- Infer style, shot focus, motion, and reference behavior from the prompt."]),
    "- Favor one clear shot, one primary subject, one main action, and one camera move.",
    "- Use clear subject motion, stable temporal continuity, intentional camera perspective, and a usable final frame.",
    "",
    "Prompt anatomy to satisfy:",
    "- Subject, scene, action, camera, motion, lighting/style, timing, final frame, avoid.",
    "",
    "Avoid:",
    ...guardrails.map((rule) => `- ${rule}`),
    "- Do not add extra subjects, random logos, unreadable text, distorted hands/faces, flicker, or unnecessary scene changes.",
    ...(memory.length > 0 ? ["", "Recent memory:", ...memory.map((item) => `- ${item}`)] : []),
  ].join("\n");

  return truncateText(prompt, VENDOR_PROMPT_MAX_CHARS);
}

function buildPromptPackage(prompt: string, conversation: Conversation, selectedTagIds: string[], format: PromptPackageFormat, referencedVideo?: VideoJob) {
  return compileVendorPrompt(createVideoGenerationJobContract(prompt, conversation, selectedTagIds, format, referencedVideo));
}

function getReadableRateLabel(priceLabel?: string) {
  if (!priceLabel) {
    return "Check vendor pricing";
  }

  return priceLabel.replaceAll(", ", " | ");
}

function getInputIcon(mode: string) {
  if (mode === "image" || mode === "reference-image") {
    return ImagePlus;
  }

  if (mode === "video") {
    return Video;
  }

  return FileText;
}

function getSupportedResolutions(model?: ReturnType<typeof getAiVideoModelPricing>) {
  return model?.supportedResolutions?.length ? model.supportedResolutions : ["480p", "720p", "1080p", "4K"];
}

export function AiVideoWorkspace() {
  const [project, setProject] = useState<LocalProject>(() => createProject());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("assets");
  const [model, setModel] = useState(MODEL_OPTIONS[0].id);
  const [customModel, setCustomModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [customizeVideoType, setCustomizeVideoType] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration] = useState<number | "">("");
  const [resolution, setResolution] = useState("720p");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [creativeControls, setCreativeControls] = useState<CreativeControlSelections>({
    purpose: "product-demo",
    style: "cinematic-scene",
    shotFocus: AUTO_CONTROL_ID,
    motionEdit: AUTO_CONTROL_ID,
    referenceBehavior: AUTO_CONTROL_ID,
  });
  const [inputImages, setInputImages] = useState<InputImage[]>([]);
  const [referencedVideoId, setReferencedVideoId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [videoPreviewError, setVideoPreviewError] = useState("");
  const [useCompatPreview, setUseCompatPreview] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedKey = window.localStorage.getItem(KEY_STORAGE_KEY);

    if (storedKey) {
      setApiKey(storedKey);
      setRememberKey(true);
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          project?: LocalProject;
          conversations: Conversation[];
          activeConversationId: string;
        };

        if (parsed.project) {
          setProject(parsed.project);
        }

        if (Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
          setConversations(parsed.conversations);
          setActiveConversationId(parsed.activeConversationId || parsed.conversations[0].id);
          return;
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const firstConversation = createConversation();
    setConversations([firstConversation]);
    setActiveConversationId(firstConversation.id);
  }, []);

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, conversations, activeConversationId }));
  }, [activeConversationId, conversations, project]);

  useEffect(() => {
    if (rememberKey && apiKey) {
      window.localStorage.setItem(KEY_STORAGE_KEY, apiKey);
    } else if (!rememberKey) {
      window.localStorage.removeItem(KEY_STORAGE_KEY);
    }
  }, [apiKey, rememberKey]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0],
    [activeConversationId, conversations],
  );
  const selectedModel = customModel.trim() || model;
  const selectedModelPricing = getAiVideoModelPricing(selectedModel);
  const selectedVideoRate = getEstimatedVideoRate(selectedModel, {
    resolution,
    withAudio: generateAudio,
    hasImageInput: inputImages.length > 0,
    aspectRatio,
  });
  const imageInputPrice = getImageInputPrice(selectedModel);
  const estimatedGenerationCost =
    duration === ""
      ? null
      : getEstimatedVideoGenerationCost(selectedModel, {
          durationSeconds: duration,
          resolution,
          withAudio: generateAudio,
          hasImageInput: inputImages.length > 0,
          aspectRatio,
        });
  const modelCompatibilityIssues =
    duration === ""
      ? getModelCompatibilityIssues(selectedModel, {
          resolution,
          aspectRatio,
          withAudio: generateAudio,
          inputImagesCount: inputImages.length,
          hasLastFrame: inputImages.some((image) => image.mode === "last_frame"),
        })
      : getModelCompatibilityIssues(selectedModel, {
          durationSeconds: duration,
          resolution,
          aspectRatio,
          withAudio: generateAudio,
          inputImagesCount: inputImages.length,
          hasLastFrame: inputImages.some((image) => image.mode === "last_frame"),
        });
  const supportedResolutions = getSupportedResolutions(selectedModelPricing);
  const selectedTagIds = useMemo(
    () => Object.values(creativeControls).filter((controlId) => controlId !== AUTO_CONTROL_ID),
    [creativeControls],
  );

  function selectModel(modelId: string) {
    setModel(modelId);

    const nextModel = getAiVideoModelPricing(modelId);
    const nextResolutions = getSupportedResolutions(nextModel);
    if (!nextResolutions.includes(resolution)) {
      setResolution(nextResolutions[0]);
    }
  }

  function markCustomVideoType() {
    setCustomizeVideoType(true);
  }
  function createPromptPackageFormat(scenePrompt: string): PromptPackageFormat {
    const inferredDuration = duration === "" ? inferDurationFromPrompt(scenePrompt) : duration;

    return {
      model: selectedModel,
      modelName: selectedModelPricing?.name,
      aspectRatio,
      resolution,
      duration: inferredDuration,
      generateAudio,
      imageCount: inputImages.length,
      rateLabel: selectedModelPricing?.priceLabel,
      estimatedRate: selectedVideoRate,
    };
  }
  const currentJob = activeConversation?.jobs[activeConversation.jobs.length - 1];
  const currentJobVersion = currentJob && activeConversation ? activeConversation.jobs.findIndex((job) => job.id === currentJob.id) + 1 : 0;
  const referencedVideo = useMemo(
    () => activeConversation?.jobs.find((job) => job.id === referencedVideoId),
    [activeConversation, referencedVideoId],
  );

  useEffect(() => {
    setVideoPreviewError("");
    setUseCompatPreview(false);
  }, [currentJob?.videoUrl]);
  const completedJobs = useMemo(
    () =>
      conversations.flatMap((conversation) =>
        conversation.jobs.map((job) => ({ ...job, conversationId: conversation.id, conversationTitle: conversation.title })),
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [conversations],
  );

  useEffect(() => {
    if (referencedVideoId && !referencedVideo) {
      setReferencedVideoId("");
    }
  }, [referencedVideo, referencedVideoId]);

  function updateConversation(id: string, updater: (conversation: Conversation) => Conversation) {
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? updater(conversation) : conversation)),
    );
  }

  function updateProject(updater: (project: LocalProject) => LocalProject) {
    setProject((current) => updater({ ...current, updatedAt: now() }));
  }

  const updateJob = useCallback((conversationId: string, jobId: string, updater: (job: VideoJob) => VideoJob) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              jobs: conversation.jobs.map((job) => (job.id === jobId ? updater(job) : job)),
            }
          : conversation,
      ),
    );
  }, []);

  function addConversation() {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setPrompt("");
    setInputImages([]);
    setReferencedVideoId("");
    setStatusMessage("New conversation created.");
  }

  function deleteConversation(id: string) {
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== id);
      if (id === activeConversationId) {
        setActiveConversationId(next[0]?.id || "");
      }

      return next.length > 0 ? next : [createConversation()];
    });
  }

  function selectCreativeControl(category: CreativeControlCategory, id: string) {
    setCreativeControls((current) => ({ ...current, [category]: id }));
  }

  async function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function uploadReferenceImage(dataUrl: string, file: File) {
    const response = await fetch("/api/ai-video/upload-reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        filename: file.name,
        conversationId: activeConversation?.id,
      }),
    });
    const result = (await response.json()) as UploadReferenceResponse;

    if (!response.ok || result.error || !result.publicUrl) {
      throw new Error(getErrorMessage(result.error || result, "Could not upload reference image."));
    }

    return result.publicUrl;
  }

  async function addReferenceImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setStatusMessage("Uploading reference images...");

    let uploadedCount = 0;
    let stagedCount = 0;
    const images = await Promise.all(
      files.map(async (file, index) => {
        const dataUrl = await readFileAsDataUrl(file);
        let url = dataUrl;

        try {
          url = await uploadReferenceImage(dataUrl, file);
          uploadedCount += 1;
        } catch {
          stagedCount += 1;
        }

        return {
          id: makeId("image"),
          url,
          label: file.name,
          mode: (inputImages.length === 0 && index === 0 ? "first_frame" : "reference") as InputImage["mode"],
        };
      }),
    );

    setInputImages((current) => [...current, ...images]);
    setStatusMessage(
      stagedCount > 0
        ? `${uploadedCount} reference${uploadedCount === 1 ? "" : "s"} uploaded. ${stagedCount} stayed local because Supabase Storage is not ready.`
        : `${uploadedCount} reference${uploadedCount === 1 ? "" : "s"} uploaded to public storage.`,
    );
    event.target.value = "";
  }

  async function importMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    const importedAssets = await Promise.all(
      files.map(async (file) => {
        const kind: AssetKind = file.type.startsWith("audio/")
          ? "audio"
          : file.type.startsWith("image/")
            ? "image"
            : "video";

        return {
          id: makeId("asset"),
          name: file.name,
          kind,
          url: await readFileAsDataUrl(file),
          source: "import" as const,
          createdAt: now(),
        };
      }),
    );

    updateProject((current) => ({
      ...current,
      assets: [...importedAssets, ...current.assets],
    }));
    setStatusMessage(`${importedAssets.length} asset${importedAssets.length === 1 ? "" : "s"} imported.`);
    event.target.value = "";
  }

  function addAssetToTimeline(asset: MediaAsset) {
    const track: TimelineClip["track"] =
      asset.kind === "audio" ? "audio" : asset.kind === "logo" || asset.kind === "image" ? "overlay" : "video";

    updateProject((current) => ({
      ...current,
      timeline: [
        ...current.timeline,
        {
          id: makeId("clip"),
          assetId: asset.id,
          name: asset.name,
          kind: asset.kind,
          track,
          start: 0,
          end: asset.kind === "audio" ? 30 : 6,
        },
      ],
    }));
    setStatusMessage(`${asset.name} added to timeline.`);
  }

  const addGeneratedAsset = useCallback((job: VideoJob, videoUrl: string) => {
    const assetId = `asset-${job.id}`;

    setProject((current) => {
      if (current.assets.some((asset) => asset.id === assetId)) {
        return {
          ...current,
          updatedAt: now(),
          assets: current.assets.map((asset) => (asset.id === assetId ? { ...asset, url: videoUrl } : asset)),
        };
      }

      const asset: MediaAsset = {
        id: assetId,
        name: job.prompt.slice(0, 48) || "Generated video",
        kind: "generated",
        url: videoUrl,
        source: "generated",
        createdAt: now(),
        linkedJobId: job.id,
      };

      return {
        ...current,
        updatedAt: now(),
        assets: [asset, ...current.assets],
        timeline: [
          ...current.timeline,
          {
            id: makeId("clip"),
            assetId: asset.id,
            name: asset.name,
            kind: asset.kind,
            track: "video",
            start: 0,
            end: 6,
          },
        ],
      };
    });
  }, []);

  const cacheOutput = useCallback(
    async (job: VideoJob, sourceUrl = job.videoUrl) => {
      if (!activeConversation || !sourceUrl || job.cacheStatus === "caching") {
        return;
      }

      updateJob(activeConversation.id, job.id, (current) => ({
        ...current,
        cacheStatus: "caching",
        cacheError: undefined,
      }));
      setStatusMessage("Caching vendor output locally for preview...");

      try {
        const response = await fetch("/api/ai-video/cache-output", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, videoUrl: sourceUrl }),
        });
        const result = (await response.json()) as CacheOutputResponse;

        if (!response.ok || result.error) {
          throw new Error(getErrorMessage(result.error || result, "Could not cache output locally."));
        }

        updateJob(activeConversation.id, job.id, (current) => ({
          ...current,
          localSourceUrl: result.sourceUrl || current.localSourceUrl,
          localPreviewUrl: result.previewUrl || current.localPreviewUrl,
          cacheStatus: result.previewUrl ? "ready" : "failed",
          cacheError: result.previewUrl ? undefined : "Cached source, but no browser preview was created.",
          updatedAt: now(),
        }));

        if (result.previewUrl || result.sourceUrl) {
          addGeneratedAsset(job, result.previewUrl || result.sourceUrl || sourceUrl);
        }

        setStatusMessage(result.previewUrl ? "Local preview is ready." : "Output cached locally.");
      } catch (error) {
        const message = getErrorMessage(error, "Could not cache output locally.");

        updateJob(activeConversation.id, job.id, (current) => ({
          ...current,
          cacheStatus: "failed",
          cacheError: message,
          updatedAt: now(),
        }));
        setStatusMessage(message);
      }
    },
    [activeConversation, addGeneratedAsset, updateJob],
  );

  function removeImage(id: string) {
    setInputImages((current) => current.filter((image) => image.id !== id));
  }

  function selectVideoAsReference(job: VideoJob) {
    setReferencedVideoId(job.id);
    setPrompt((current) =>
      current.trim()
        ? current
        : `Edit the referenced video while preserving its strongest parts. Improve the pacing, camera intention, and visual taste.`,
    );
    setStatusMessage("Video selected as reference.");
  }

  function replyToVideo(job: VideoJob) {
    selectVideoAsReference(job);
    setPrompt(`Reply/edit this video: keep continuity from "${job.prompt}" and make the next version more cinematic.`);
  }

  async function copyPrompt() {
    if (!activeConversation) {
      return;
    }

    await navigator.clipboard.writeText(
      buildPromptPackage(
        prompt || "Describe the next shot.",
        activeConversation,
        selectedTagIds,
        createPromptPackageFormat(prompt || "Describe the next shot."),
        referencedVideo,
      ),
    );
    setStatusMessage("Prompt package copied.");
  }

  async function copyVideoUrl(job: VideoJob) {
    if (!job.videoUrl) {
      setStatusMessage("This video does not have a URL yet.");
      return;
    }

    await navigator.clipboard.writeText(job.videoUrl);
    setStatusMessage("Video URL copied.");
  }

  async function submitGeneration() {
    if (!activeConversation || !prompt.trim()) {
      setStatusMessage("Add a scene prompt first.");
      return;
    }

    if (!apiKey.trim()) {
      setSettingsOpen(true);
      setStatusMessage("Add your OpenRouter key in Settings first.");
      return;
    }

    if (modelCompatibilityIssues.length > 0) {
      setStatusMessage(`Adjust model settings first: ${modelCompatibilityIssues[0]}`);
      return;
    }

    const effectiveDuration = duration === "" ? inferDurationFromPrompt(prompt) : duration;
    if (
      effectiveDuration !== undefined &&
      selectedModelPricing?.supportedDurations &&
      !selectedModelPricing.supportedDurations.includes(effectiveDuration)
    ) {
      setStatusMessage(`This model supports ${selectedModelPricing.supportedDurations.join(", ")}s clips. Adjust the prompt duration or choose another model.`);
      return;
    }

    const localOnlyReferences = inputImages.filter((image) => !isPublicHttpsUrl(image.url));
    if (localOnlyReferences.length > 0) {
      setStatusMessage(
        "OpenRouter video references need public HTTPS image URLs. This local upload is staged in the workspace, but it cannot be sent to the vendor yet. Remove the image to generate text-to-video for now.",
      );
      return;
    }

    setIsGenerating(true);
    setStatusMessage("Building prompt package and submitting generation...");

    const promptFormat = createPromptPackageFormat(prompt);
    const finalPrompt = buildPromptPackage(prompt, activeConversation, selectedTagIds, promptFormat, referencedVideo);
    const createdAt = now();
    const optimisticJob: VideoJob = {
      id: makeId("job"),
      status: "pending",
      model: selectedModel,
      prompt,
      finalPrompt,
      createdAt,
      updatedAt: createdAt,
      inputImages,
      referencedVideoId: referencedVideo?.id,
      referencedVideoUrl: referencedVideo?.videoUrl,
    };

    const frameImages = inputImages
      .filter((image) => image.mode === "first_frame" || image.mode === "last_frame")
      .map((image) => ({
        type: "image_url",
        image_url: { url: image.url },
        frame_type: image.mode,
      }));

    const references = inputImages
      .filter((image) => image.mode === "reference")
      .map((image) => ({
        type: "image_url",
        image_url: { url: image.url },
      }));

    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: conversation.title === "Untitled video scene" ? prompt.slice(0, 52) : conversation.title,
      updatedAt: createdAt,
      jobs: [...conversation.jobs, optimisticJob],
      messages: [
        ...conversation.messages,
        { id: makeId("message"), role: "user", content: prompt, createdAt },
        {
          id: makeId("message"),
          role: "assistant",
          content: referencedVideo
            ? `Referenced ${referencedVideo.providerJobId || referencedVideo.id}, applied ${selectedTagIds.length} creative controls, and submitted to ${selectedModel}.`
            : `Applied ${selectedTagIds.length} creative controls and submitted to ${selectedModel}.`,
          createdAt,
          videoJobId: optimisticJob.id,
        },
      ],
    }));

    try {
      const response = await fetch("/api/ai-video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model: selectedModel,
          prompt: finalPrompt,
          aspect_ratio: aspectRatio,
          duration: effectiveDuration,
          resolution,
          generate_audio: generateAudio,
          frame_images: frameImages,
          input_references: references,
        }),
      });

      const result = (await response.json()) as OpenRouterJobResponse;

      if (!response.ok || result.error) {
        throw new Error(getErrorMessage(result.error || result.message || result, "OpenRouter rejected the generation request."));
      }

      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        jobs: conversation.jobs.map((job) =>
          job.id === optimisticJob.id
            ? {
                ...job,
                providerJobId: result.id,
                generationId: result.generation_id,
                pollingUrl: result.polling_url,
                status: result.status || "pending",
                updatedAt: now(),
              }
            : job,
        ),
      }));
      setPrompt("");
      setStatusMessage("Job submitted. Polling will update the preview.");
    } catch (error) {
      const message = getErrorMessage(error, "Generation failed.");
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        jobs: conversation.jobs.map((job) =>
          job.id === optimisticJob.id ? { ...job, status: "failed", error: message, updatedAt: now() } : job,
        ),
      }));
      setStatusMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  const pollJob = useCallback(async (job: VideoJob) => {
    if (!activeConversation || !job.pollingUrl) {
      setStatusMessage("This job does not have a polling URL yet.");
      return;
    }

    if (!apiKey.trim()) {
      setSettingsOpen(true);
      setStatusMessage("Add your OpenRouter key to poll jobs.");
      return;
    }

    setStatusMessage(`Checking ${job.providerJobId || job.id}...`);

    try {
      const response = await fetch("/api/ai-video/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, pollingUrl: job.pollingUrl }),
      });
      const result = (await response.json()) as OpenRouterJobResponse;

      if (!response.ok || result.error) {
        throw new Error(getErrorMessage(result.error || result.message || result, "Could not poll video status."));
      }

      const videoUrl = result.unsigned_urls?.[0];
      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        jobs: conversation.jobs.map((existingJob) =>
          existingJob.id === job.id
            ? {
                ...existingJob,
                status: result.status || existingJob.status,
                generationId: result.generation_id || existingJob.generationId,
                videoUrl: videoUrl || existingJob.videoUrl,
                cost: result.usage?.cost ?? existingJob.cost,
                updatedAt: now(),
              }
            : existingJob,
        ),
      }));
      if (videoUrl) {
        addGeneratedAsset(job, videoUrl);
        void cacheOutput({ ...job, videoUrl }, videoUrl);
      }
      setStatusMessage(videoUrl ? "Video is ready." : `Status: ${result.status || "pending"}`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Could not poll video status."));
    }
  }, [activeConversation, addGeneratedAsset, apiKey, cacheOutput]);

  useEffect(() => {
    if (!activeConversation || !apiKey) {
      return;
    }

    const jobsToPoll = activeConversation.jobs.filter(
      (job) => (job.status === "pending" || job.status === "in_progress") && job.pollingUrl,
    );

    if (jobsToPoll.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollJob(jobsToPoll[0]);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [activeConversation, apiKey, pollJob]);

  if (!activeConversation) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0b0c0f] text-slate-100">
      <header className="flex flex-col gap-3 border-b border-white/10 bg-[#101318] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
            <Video className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AI Video Studio</p>
            <h1 className="truncate text-lg font-semibold">{project.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm",
              apiKey ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200",
            )}
          >
            {apiKey ? <CheckCircle2 className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {apiKey ? "OpenRouter connected" : "API key needed"}
          </span>
          <Button variant="outline" onClick={() => setSecondaryOpen((current) => !current)} className="border-white/10 bg-transparent">
            <Layers />
            {secondaryOpen ? "Hide Tools" : "Assets / Timeline"}
          </Button>
          <Button onClick={() => setSettingsOpen(true)} className="bg-white text-slate-950 hover:bg-slate-200">
            <Settings />
            Settings
          </Button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_300px_340px]">
        <aside className="border-b border-white/10 bg-[#101318] p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conversations</p>
              <p className="text-sm text-slate-400">{conversations.length} scenes</p>
            </div>
            <Button size="icon" onClick={addConversation} title="New conversation">
              <Plus />
            </Button>
          </div>
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveConversationId(conversation.id)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
                  conversation.id === activeConversationId
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 text-cyan-300" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{conversation.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {conversation.jobs.length} videos - {formatTime(conversation.updatedAt)}
                  </span>
                </span>
                <Trash2
                  className="h-4 w-4 text-slate-500 opacity-0 transition hover:text-red-300 group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                />
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 bg-[#0b0c0f] p-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <section className="overflow-hidden rounded-lg border border-white/10 bg-[#07080a]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workspace</p>
                  <h2 className="text-lg font-semibold">{activeConversation.title}</h2>
                </div>
                {currentJob ? (
                  <Button size="icon" variant="ghost" onClick={() => pollJob(currentJob)} title="Poll status">
                    <RefreshCw />
                  </Button>
                ) : null}
              </div>
              <div className="aspect-video">
                {currentJob?.videoUrl ? (
                  <div className="relative h-full w-full bg-black">
                    {getVideoDeliveryType(currentJob.videoUrl) === "hls" || getVideoDeliveryType(currentJob.videoUrl) === "dash" ? (
                      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-300">
                        <Video className="mb-3 h-9 w-9 text-cyan-300" />
                        <p className="font-medium text-slate-100">
                          {getVideoDeliveryType(currentJob.videoUrl) === "hls" ? "HLS playlist output detected" : "DASH playlist output detected"}
                        </p>
                        <p className="mt-2 max-w-md text-slate-500">
                          This browser needs a media engine such as Hls.js or Dash.js to play playlist streams inline. Download or open the source for now.
                        </p>
                      </div>
                    ) : (
                      <video
                        key={`${currentJob.videoUrl}-${currentJob.localPreviewUrl || "remote"}-${useCompatPreview ? "compat" : "native"}`}
                        src={useCompatPreview ? getCompatStreamUrl(currentJob) : getStreamUrl(currentJob)}
                        controls
                        crossOrigin="anonymous"
                        playsInline
                        preload="metadata"
                        onCanPlay={() => setVideoPreviewError("")}
                        onError={(event) => {
                          const error = event.currentTarget.error;
                          if (!currentJob.localPreviewUrl && currentJob.videoUrl && currentJob.cacheStatus !== "caching") {
                            setVideoPreviewError("Browser format error detected. Caching and converting this output locally...");
                            void cacheOutput(currentJob);
                            return;
                          }

                          if (!useCompatPreview) {
                            setUseCompatPreview(true);
                            setVideoPreviewError("Browser format error detected. Retrying through local compatibility preview...");
                            return;
                          }

                          setVideoPreviewError(error?.message || "The browser could not play this preview after local compatibility conversion.");
                        }}
                        className="h-full w-full bg-black"
                      />
                    )}
                    {videoPreviewError || getVideoDeliveryType(currentJob.videoUrl) === "hls" || getVideoDeliveryType(currentJob.videoUrl) === "dash" ? (
                      <div className="absolute inset-x-4 bottom-4 rounded-lg border border-amber-400/30 bg-black/80 p-3 text-sm text-amber-100">
                        {videoPreviewError ? <p>{videoPreviewError}</p> : null}
                        {useCompatPreview ? <p className="mt-1 text-xs text-amber-200/80">Using local FFmpeg compatibility preview.</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a href={getDownloadUrl(currentJob)} className="text-cyan-200 hover:underline">
                            Download video
                          </a>
                          <a href={currentJob.videoUrl} target="_blank" rel="noreferrer" className="text-cyan-200 hover:underline">
                            Open source
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                    <Play className="h-10 w-10" />
                    <p className="text-sm">Generated video preview appears here.</p>
                  </div>
                )}
              </div>
              {currentJob ? (
                <div className="grid gap-3 border-t border-white/10 p-4 text-sm text-slate-400 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-slate-200">{currentJob.prompt}</p>
                    <p className="mt-1">
                      {currentJob.model} - {currentJob.status}
                      {currentJobVersion ? ` - version ${currentJobVersion} of ${activeConversation.jobs.length}` : ""}
                      {currentJob.cost !== undefined ? ` - $${currentJob.cost.toFixed(4)}` : ""}
                    </p>
                    {currentJob.error ? <p className="mt-2 text-amber-200">{currentJob.error}</p> : null}
                    {currentJob.cacheStatus ? (
                      <p className={cn("mt-2 text-xs", currentJob.cacheStatus === "failed" ? "text-amber-200" : "text-cyan-200")}>
                        {currentJob.cacheStatus === "caching"
                          ? "Caching local preview..."
                          : currentJob.cacheStatus === "ready"
                            ? "Local preview ready."
                            : currentJob.cacheError || "Local preview cache failed."}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentJob.videoUrl && currentJob.cacheStatus !== "caching" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => cacheOutput(currentJob)} className="border-white/10 bg-transparent">
                        <RefreshCw />
                        {currentJob.localPreviewUrl ? "Rebuild preview" : "Repair preview"}
                      </Button>
                    ) : null}
                    {currentJob.videoUrl ? (
                      <a
                        href={getDownloadUrl(currentJob)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" onClick={() => replyToVideo(currentJob)} className="border-white/10 bg-transparent">
                      <Reply />
                      Reply
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => selectVideoAsReference(currentJob)} className="border-white/10 bg-transparent">
                      <Video />
                      Refer
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              {referencedVideo ? (
                <div className="mb-3 flex flex-col gap-3 rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Replying to video</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-100">{referencedVideo.prompt}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReferencedVideoId("")}>
                    Clear
                  </Button>
                </div>
              ) : null}
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the shot, edit, or next version..."
                className="min-h-[130px] resize-none border-white/10 bg-black/30 text-base text-slate-100"
              />
              <p className="mt-2 text-xs text-slate-500">
                Creative controls steer the result. Your prompt still defines the specific subject, content, action, and timing.
              </p>
              <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-3 text-sm text-slate-300 hover:bg-white/10">
                    <ImagePlus className="h-4 w-4" />
                    Drop / stage references
                    <input type="file" accept="image/*" multiple onChange={addReferenceImages} className="sr-only" />
                  </label>
                  {inputImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="grid h-10 grid-cols-[32px_minmax(0,90px)_16px] items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-1 text-xs text-slate-300"
                      title="Remove reference"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.label} className="h-8 w-8 rounded object-cover" />
                      <span className="truncate">{isPublicHttpsUrl(image.url) ? image.label : `${image.label} (staged)`}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={copyPrompt} className="border-white/10 bg-transparent">
                    <Copy />
                    Copy
                  </Button>
                  <Button onClick={submitGeneration} disabled={isGenerating} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                    {isGenerating ? <RefreshCw className="animate-spin" /> : <Send />}
                    Generate
                  </Button>
                </div>
              </div>
              {statusMessage ? <p className="mt-3 text-sm text-cyan-200">{statusMessage}</p> : null}
            </section>

            {secondaryOpen ? (
              <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {[
                    { id: "assets", label: "Assets" },
                    { id: "timeline", label: "Timeline" },
                    { id: "export", label: "Export" },
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      type="button"
                      variant={activeTab === tab.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                      className={cn(activeTab !== tab.id && "border-white/10 bg-transparent")}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {activeTab === "assets" ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">Media Bin</h3>
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium hover:bg-white/10">
                        <Upload className="h-4 w-4" />
                        Import
                        <input type="file" accept="video/*,image/*,audio/*" multiple onChange={importMedia} className="sr-only" />
                      </label>
                    </div>
                    {project.assets.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
                        Import media or generate a clip to build the project library.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {project.assets.map((asset) => (
                          <div key={asset.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{asset.name}</p>
                              <p className="text-xs text-slate-500">
                                {asset.kind} - {asset.source}
                              </p>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={() => addAssetToTimeline(asset)} className="border-white/10 bg-transparent">
                              <Layers />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === "timeline" ? (
                  <div>
                    <h3 className="font-semibold">Simple Timeline</h3>
                    <div className="mt-3 space-y-2">
                      {project.timeline.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
                          Add assets to create a local edit timeline.
                        </div>
                      ) : (
                        project.timeline.map((clip, index) => (
                          <div key={clip.id} className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[36px_minmax(0,1fr)_auto] md:items-center">
                            <span className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-sm">{index + 1}</span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{clip.name}</p>
                              <p className="text-xs text-slate-500">
                                {clip.track} - trim {clip.start}s to {clip.end}s
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateProject((current) => ({
                                  ...current,
                                  timeline: current.timeline.filter((item) => item.id !== clip.id),
                                }))
                              }
                            >
                              <Trash2 />
                              Delete
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === "export" ? (
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
                      <h3 className="font-semibold">Export Final Video</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Desktop version will render this timeline locally with FFmpeg into {project.outputFolder}.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={project.exportFormat}
                        onChange={(event) =>
                          updateProject((current) => ({
                            ...current,
                            exportFormat: event.target.value as LocalProject["exportFormat"],
                          }))
                        }
                        className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-slate-100"
                      >
                        <option value="mp4">MP4</option>
                        <option value="mov">MOV</option>
                        <option value="webm">WebM</option>
                      </select>
                      <Button type="button" onClick={() => setStatusMessage("Export is planned for the Tauri/FFmpeg layer.")}>
                        <Save />
                        Export
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </section>

        <aside className="border-t border-white/10 bg-[#0d0f13] p-4 xl:border-l xl:border-t-0">
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
              <div>
                <h3 className="font-semibold">Creative Controls</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Steer the result. Auto lets the app infer from your prompt.</p>
              </div>
            </div>
            <div className="space-y-3">
              {CREATIVE_CONTROL_CATEGORIES.map((category) => {
                const controls = PRODUCT_TAG_CONTRACTS.filter((tag) => tag.category === category.id);

                return (
                  <div key={category.id}>
                    <p className="mb-1.5 text-xs font-medium text-slate-400">{category.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {controls.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => selectCreativeControl(category.id, tag.id)}
                          title={`${tag.definition} ${tag.whenToUse}`}
                          className={cn(
                            "h-9 rounded-lg border px-3 text-xs font-medium transition",
                            creativeControls[category.id] === tag.id
                              ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                          )}
                        >
                          {tag.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => selectCreativeControl(category.id, AUTO_CONTROL_ID)}
                        className={cn(
                          "h-9 rounded-lg border px-3 text-xs font-medium transition",
                          creativeControls[category.id] === AUTO_CONTROL_ID
                            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                            : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                        )}
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-slate-500">
              <Aperture className="h-4 w-4" />
              <Brain className="h-4 w-4" />
              <WandSparkles className="h-4 w-4" />
              <Clapperboard className="h-4 w-4" />
            </div>
          </section>
        </aside>

        <aside className="border-t border-white/10 bg-[#101318] p-4 xl:border-l xl:border-t-0">
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <button
              type="button"
              onClick={() => setGenerationOpen((current) => !current)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <span className="flex min-w-0 items-start gap-2">
                <Clapperboard className="mt-0.5 h-4 w-4 text-cyan-300" />
                <span className="min-w-0">
                  <span className="block font-semibold">Generation</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {selectedModelPricing?.name || selectedModel} - {resolution} - {selectedVideoRate !== null ? `$${selectedVideoRate.toFixed(3)}/s` : "rate varies"}
                  </span>
                </span>
              </span>
              {generationOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {generationOpen ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">Model</span>
                <select
                  value={model}
                  onChange={(event) => selectModel(event.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-slate-100"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">Custom model</span>
                <Input
                  value={customModel}
                  onChange={(event) => setCustomModel(event.target.value)}
                  placeholder="Optional slug"
                  className="border-white/10 bg-black/30 text-slate-100"
                />
              </label>
              {selectedModelPricing ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {selectedModelPricing.inputModes.map((mode) => {
                    const Icon = getInputIcon(mode);

                    return (
                      <span key={mode} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2" title={mode}>
                        <Icon className="h-3.5 w-3.5" />
                        {mode.replace("reference-", "ref ")}
                      </span>
                    );
                  })}
                  <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-cyan-400/10 px-2 text-cyan-100">
                    <Video className="h-3.5 w-3.5" />
                    video output
                  </span>
                </div>
              ) : null}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">Video type</p>
                    <p className="text-xs text-slate-500">
                      {aspectRatio} - {resolution}
                      {generateAudio ? " - audio" : ""}
                    </p>
                  </div>
                  <span className="rounded bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-100" title="Estimated video output rate">
                    {duration !== "" && estimatedGenerationCost !== null
                      ? `~$${estimatedGenerationCost.toFixed(3)}`
                      : selectedVideoRate !== null
                        ? `$${selectedVideoRate.toFixed(3)}/s`
                    : "rate varies"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {supportedResolutions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setResolution(value);
                      }}
                      className={cn(
                        "h-10 rounded-lg border px-3 text-sm font-medium transition",
                        resolution === value
                          ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 bg-black/30 text-slate-300 hover:bg-white/10",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>{getReadableRateLabel(selectedModelPricing?.priceLabel)}</p>
                  {modelCompatibilityIssues.length > 0 ? (
                    <p className="text-amber-200">{modelCompatibilityIssues[0]}</p>
                  ) : null}
                  {selectedModelPricing ? (
                    <a
                      href={selectedModelPricing.openRouterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-200 hover:underline"
                    >
                      OpenRouter pricing
                      <Link2 className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomizeVideoType((current) => !current)}
                  className="mt-2 h-8 px-2 text-xs"
                >
                  {customizeVideoType ? "Hide custom settings" : "Customize"}
                </Button>
              </div>
              {imageInputPrice !== null ? (
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                  Image references add ${imageInputPrice.toFixed(3)} per image for this model.
                </div>
              ) : null}
              {customizeVideoType ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-400">Aspect</span>
                    <select
                      value={aspectRatio}
                      onChange={(event) => {
                        markCustomVideoType();
                        setAspectRatio(event.target.value);
                      }}
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-slate-100"
                    >
                      {["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9", "9:21"].map((ratio) => (
                        <option key={ratio}>{ratio}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={generateAudio}
                      onChange={(event) => {
                        markCustomVideoType();
                        setGenerateAudio(event.target.checked);
                      }}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    Audio
                  </label>
                </div>
              ) : null}
            </div>
            ) : null}
          </section>

          <section className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-300" />
              <h3 className="font-semibold">Recent Outputs</h3>
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {completedJobs.length === 0 ? (
                <p className="text-sm text-slate-500">No generations yet.</p>
              ) : (
                completedJobs.map((job) => (
                  <div
                    key={job.id}
                    className={cn(
                      "rounded-lg border p-3",
                      referencedVideoId === job.id ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveConversationId(job.conversationId)}
                      className="block w-full text-left"
                    >
                      <p className="truncate text-sm font-medium">{job.prompt}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {job.status} - {formatTime(job.createdAt)}
                      </p>
                      {job.error ? <p className="mt-2 line-clamp-2 text-xs text-amber-200">{job.error}</p> : null}
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveConversationId(job.conversationId);
                          replyToVideo(job);
                        }}
                        className="border-white/10 bg-transparent"
                      >
                        <Reply />
                        Reply
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveConversationId(job.conversationId);
                          selectVideoAsReference(job);
                        }}
                        className="border-white/10 bg-transparent"
                      >
                        <Video />
                        Refer
                      </Button>
                      {job.videoUrl ? (
                        <>
                          <a
                            href={getDownloadUrl(job)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium hover:bg-white/10"
                          >
                            <Download className="h-4 w-4" />
                            Save
                          </a>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyVideoUrl(job)}
                            className="border-white/10 bg-transparent"
                          >
                            <Link2 />
                            URL
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4">
          <div className="ml-auto h-full w-full max-w-md overflow-y-auto rounded-lg border border-white/10 bg-[#101318] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Settings</p>
                <h2 className="text-xl font-semibold">One-time setup</h2>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSettingsOpen(false)} title="Close settings">
                <X />
              </Button>
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-cyan-300" />
                  <h3 className="font-semibold">OpenRouter</h3>
                </div>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="OpenRouter API key"
                  className="border-white/10 bg-black/30 text-slate-100"
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberKey}
                    onChange={(event) => setRememberKey(event.target.checked)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                  Remember locally for this prototype
                </label>
              </section>

              <section className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-cyan-300" />
                  <h3 className="font-semibold">Project Defaults</h3>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">Project name</span>
                  <Input
                    value={project.name}
                    onChange={(event) =>
                      updateProject((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="border-white/10 bg-black/30 text-slate-100"
                  />
                </label>
                <label className="mt-3 block text-sm">
                  <span className="mb-1 block text-slate-400">Output folder target</span>
                  <Input
                    value={project.outputFolder}
                    onChange={(event) =>
                      updateProject((current) => ({
                        ...current,
                        outputFolder: event.target.value,
                      }))
                    }
                    className="border-white/10 bg-black/30 text-slate-100"
                  />
                </label>
              </section>

              <section className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">Pricing Catalog</p>
                    <p className="mt-1 text-xs text-slate-500">Stored locally from OpenRouter model pages.</p>
                  </div>
                  <a
                    href="https://openrouter.ai/models?output_modalities=text&input_modalities=video"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-xs text-cyan-200 hover:bg-white/10"
                  >
                    Source
                    <Link2 className="h-3 w-3" />
                  </a>
                </div>
                <div className="space-y-2">
                  {MODEL_OPTIONS.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-sm font-medium text-slate-100">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.priceLabel}</p>
                    </div>
                  ))}
                  {VIDEO_ANALYSIS_MODELS.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-sm font-medium text-slate-100">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.priceLabel} - video input to text output</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                <p className="font-medium text-slate-200">Desktop target</p>
                <p className="mt-2 leading-6">
                  Tauri will move keys into the OS keychain, metadata into SQLite, media into local project folders,
                  and exports through FFmpeg.
                </p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
