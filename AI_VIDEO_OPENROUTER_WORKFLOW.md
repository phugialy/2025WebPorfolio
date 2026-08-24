# AI Video OpenRouter Workflow

## What We Learned

OpenRouter video generation is an async job API. The app submits a request to `POST /api/v1/videos`, receives a job id plus polling URL, polls until the job is completed, then uses the returned `unsigned_urls` video link for preview, history, download, and timeline assets.

Model capabilities should be treated as model-specific product rules, not global app rules. OpenRouter exposes video model discovery through `/api/v1/videos/models` and the model pages. Those records are what our local pricing catalog mirrors.

## Clean Workflow Model

The product workflow is:

```text
User Prompt
+ Workspace Settings
+ References
+ Creative Controls
+ System Impact
= Compiled Vendor Prompt
```

Internally, keep the layers separate:

```text
Input Contract
  -> Interpretation Layer
  -> System Impact Layer
  -> Compiler
  -> Vendor API Payload
```

The most important architecture rule: the contract is structured job data, not the full prompt template. We can improve prompts, skills, guardrails, model-specific rules, and taste direction over time without changing the saved job contract.

## Stable Operating Contract

This shape should stay stable:

```ts
type VideoGenerationJobContract = {
  userPrompt: string;
  workspaceSettings: {
    model: string;
    modelName?: string;
    aspectRatio: string;
    resolution?: string;
    duration?: number;
    audioIntent?: "none" | "generate-if-supported";
    priceExpectation?: string;
  };
  creativeControls: {
    purpose?: string;
    style?: string;
    shotFocus?: string;
    motionEdit?: string;
    referenceBehavior?: string;
    selectedTagIds?: string[];
  };
  references?: ReferenceAsset[];
  memory?: JobMemory[];
};
```

This is the operating contract. Old jobs can keep this shape even when the compiler gets smarter.

## Evolving System Impact

These can change often:

- prompt improvement rules
- cinematic skill
- producer perspective skill
- taste direction skill
- model-specific prompting rules
- creative control definitions
- guardrails
- conflict resolution
- prompt cleanup
- reference interpretation
- final-frame rules

Example: `Cinematic` may start as "add warm lighting and camera movement." Later it can become "use motivated lighting, clear subject blocking, lens-aware framing, atmospheric depth, and stable final-frame composition." The contract did not change. Only the behavior behind the contract changed.

## Creative Controls vs Prompt

Creative Controls define how the product should steer the generation. Each control should be treated as a small contract, not just a prompt keyword:

```text
CreativeControlContract
- id: stable internal slug
- label: user-facing name
- category: purpose, style, shot focus, motion/edit, or reference behavior
- definition: what this tag means
- whenToUse: when a user should select it
- skills: capability branches the app loads into the prompt package
- promptContract: what the model should prioritize
- guardrails: what the tag should prevent or de-prioritize
```

Current controls still use the first tag set while the UI migrates to categories:

- Product Demo
- Social Ad
- Cinematic Scene
- Character Shot
- Animation Loop
- Transition
- Logo / Title
- Style Match

Prompt defines the actual content:

- Subject
- Setting
- Action
- Timing
- Mood
- Exact edit request
- What to preserve from referenced videos or images

Creative Controls are not sent as separate OpenRouter fields. They are internal metadata that the app compiles into the final prompt package before calling OpenRouter.

## Creative Control Contracts

| Tag | Definition | Skill support | Contract priority | Guardrails |
| --- | --- | --- | --- | --- |
| Product Demo | Product-forward clip that explains or sells an object, feature, or offer | product readability, material detail, scale cues, use-case staging | make the product visually clear and end on a usable product frame | do not bury the product under atmosphere or camera tricks |
| Social Ad | Short-form attention clip for feeds and quick comprehension | hook, feed readability, short-form pacing, simple motion | make the first moment strong and the action readable on small screens | do not overload the shot with too many ideas |
| Cinematic Scene | Directed scene with lighting, blocking, depth, and lens intention | motivated lighting, camera language, depth layers, atmosphere | make the scene feel directed while preserving subject clarity | do not let style replace the subject |
| Character Shot | Character-centered clip where identity and pose continuity matter | identity consistency, silhouette, expression, body timing | preserve recognizable details and expressive movement | avoid sudden face/body/costume changes |
| Animation Loop | Repeatable clip intended to loop cleanly | motion arcs, stable framing, repeatable timing | keep first and last moments visually compatible | avoid irreversible scene changes |
| Transition | Edit bridge between scenes, products, angles, or states | edit points, motion bridge, start/end frame clarity | make start/end frames usable in an edit | avoid unclear transition states |
| Logo / Title | Brand/title card where legibility and final-frame polish matter | legibility, mark priority, negative space, stable ending | keep the mark or title readable and end cleanly | avoid tiny unreadable text and noisy backgrounds |
| Style Match | Reference-led clip preserving palette, texture, or art direction | palette matching, texture continuity, reference discipline | use references as visual direction without copying flaws | do not ignore the new user subject/action |

These contracts create the branches. Later we can use the same structure to power:

- model recommendations
- default aspect/resolution suggestions
- prompt validation warnings
- tag conflicts
- tag combinations
- more precise cost expectations
- hidden skill loading per tag

## Prompt Package

Every generation should compile this order. This is the preset vendor prompt output our platform owns before anything is sent to OpenRouter:

```text
AI VIDEO GENERATION WORKFLOW

Operating contract
- Compiled from stable structured job data plus an evolving system impact layer
- User prompt is the scene/content source
- Workspace settings are the generation container
- Creative controls steer interpretation
- References anchor identity, style, product, frame, or continuity
- Do not mention the workflow contract in the output

Input contract
- User prompt
- Model
- Aspect ratio
- Resolution
- Duration, only if explicitly selected
- Audio intent
- Reference count
- Generation mode
- Price expectation

Interpretation layer
- Infer missing creative details instead of asking extra questions
- Leave unspecified creative controls on Auto
- Workspace settings win over conflicting prose
- Favor one clear shot, one subject, one main action, and one camera move

System impact layer
- Video generation skill
- Producer perspective skill
- Taste direction skill
- Cinematic scene skill
- Reference interpretation
- Prompt cleanup
- Single-shot quality protection

Prompt anatomy
- Subject
- Scene
- Action
- Camera
- Motion
- Lighting / Style
- Timing
- Final Frame
- Avoid

Selected creative controls
- Product Demo / Social Ad / etc.

Conversation memory
- Recent user prompts
- Recent assistant/job notes

Referenced video
- Prior job id
- Prior prompt
- Prior video URL when available

User scene request
- The user's actual prompt

Generation instruction
- Generate the requested video using the contract, controls, references, and memory as hidden direction
- Keep the scene visually specific, stable, and production-ready
- Prioritize subject motion, camera perspective, and a usable final frame
```

That final text becomes `prompt` in the OpenRouter request. Settings such as aspect ratio, resolution, audio, seed, frame images, and input references stay as structured request fields.

## Platform-to-API Translation

The user-facing flow should feel like this:

```text
User selects Generation
  -> app chooses model, resolution, aspect, optional audio, optional duration
User selects Creative Controls
  -> app loads only those tag skills into the prompt package
User writes Prompt
  -> app treats it as creative content, not raw API configuration
User hits Generate
  -> app compacts settings + tags + prompt + memory + references
  -> app sends compiled prompt plus real API fields to OpenRouter
  -> app receives async job and later stores the video output
```

The important product decision: users should not need to know OpenRouter's request shape. Our workspace translates their creative choices into a model-aware request. The raw API model receives only:

- A single compiled `prompt`
- Structured generation settings: `model`, `aspect_ratio`, `resolution`, optional `duration`, optional `generate_audio`
- Images as `frame_images` or `input_references`

Everything else, including Creative Controls and skills, is our own prompt orchestration layer.

## Request Shape

```json
{
  "model": "x-ai/grok-imagine-video",
  "prompt": "compiled prompt package",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "generate_audio": false,
  "frame_images": [],
  "input_references": []
}
```

Duration is optional in our workspace. When the user leaves it blank, we omit it and show price per second instead of pretending we know the final cost.

If both `frame_images` and `input_references` exist, `frame_images` should win because it describes first/last-frame image-to-video control. References are softer visual guidance.

## Response Flow

```text
Submit generation
  -> OpenRouter returns id, status, polling_url
  -> App stores pending job in the conversation
  -> App polls polling_url
  -> Completed response returns unsigned_urls and optional usage cost
  -> App saves the video URL to the job
  -> Job appears in preview, recent outputs, history, download, reply, refer, and timeline
```

## Cataloged Models

| Model | Inputs | Output | Main constraints | Pricing style |
| --- | --- | --- | --- | --- |
| xAI: Grok Imagine Video | text, image, reference image | video | 480p or 720p, 1-15s, broad aspect ratios, first-frame control | per video output second plus image input |
| Kling v3.0 Pro | text, image | video | 720p, 3-15s, 16:9/9:16/1:1, first/last frame, audio option | per second, higher with audio |
| Kling v3.0 Standard | text, image | video | 720p, 3-15s, 16:9/9:16/1:1, first/last frame, audio option | per second, higher with audio |
| Kling Video O1 | text, image | video | 720p, 5s or 10s, first/last frame, audio option | per second |
| Google Veo 3.1 | text, image | video | 720p/1080p/4K, 4/6/8s, 16:9 or 9:16, first/last frame, audio option | per second by resolution/audio |
| Google Veo 3.1 Fast | text, image | video | 720p/1080p/4K, 4/6/8s, 16:9 or 9:16, first/last frame, audio option | per second by resolution/audio |
| Google Veo 3.1 Lite | text, image | video | 720p/1080p, 4/6/8s, 16:9 or 9:16, first/last frame, audio option | per second by resolution/audio |
| MiniMax Hailuo 2.3 | text, image | video | 1080p, 6s or 10s, 16:9, first-frame, no audio | per second |
| ByteDance Seedance 2.0 | text, image, reference image | video | 480p/720p/1080p, 4-15s, broad aspect ratios, first/last frame, audio option | video tokens |
| ByteDance Seedance 2.0 Fast | text, image, reference image | video | 480p/720p, 4-15s, broad aspect ratios, first/last frame, audio option | video tokens, approximate per-second display |
| ByteDance Seedance 1.5 Pro | text, image | video | 480p/720p/1080p, 4-12s, broad aspect ratios, first/last frame, audio option | video tokens |
| Alibaba Wan 2.7 | text, image, reference image | video | 720p/1080p, 2-10s, common aspect ratios, first/last frame, audio option | per second |
| Alibaba Wan 2.6 | text, image, reference image, video | video | 720p/1080p, 5s or 10s, 16:9/9:16, first-frame, image-to-video costs more | per second by input and resolution |
| OpenAI Sora 2 Pro | text | video | 720p/1080p, 4/8/12/16/20s, 16:9 or 9:16, audio option | per second by resolution |
| MiniMax M3 | text, image, video | text | This is video understanding, not video generation | token pricing |

## App Rules

- Show only model-supported resolution buttons.
- Hide duration by default and show per-second rate.
- Show image-input cost as an info note when the model charges for image references.
- Block generation when selected settings conflict with known model constraints.
- Keep Creative Controls beside the workspace because they describe the desired result, not one-time setup.
- Keep API keys and static pricing catalog in Settings or the future desktop keychain/database layer.

## Sources To Recheck

- https://openrouter.ai/docs/guides/overview/multimodal/video-generation
- https://openrouter.ai/docs/api/api-reference/video-generation/create-videos
- https://openrouter.ai/api/v1/videos/models
- https://openrouter.ai/models?output_modalities=video
