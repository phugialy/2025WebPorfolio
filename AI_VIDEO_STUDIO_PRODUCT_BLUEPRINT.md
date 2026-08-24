# AI Video Studio Product Blueprint

## Product Promise

Use AI at vendor API prices, not platform markup prices. Bring your own keys. Run better workflows. Keep prompts, files, outputs, edits, and exports organized locally.

## Target Architecture

```text
Tauri Desktop App
  -> React workspace UI
  -> Rust command layer
  -> SQLite database for metadata
  -> OS keychain for vendor API keys
  -> Vendor API adapters
  -> Local project folder for media and outputs
  -> FFmpeg layer for timeline rendering
```

## Core Local Objects

- Project: name, output folder, export defaults, created/updated timestamps.
- Conversation: prompt memory, skill set, generation jobs, referenced videos.
- Asset: imported video/image/audio/logo, generated clips, external references.
- Timeline clip: asset reference, track, trim start/end, order.
- Vendor key: provider, label, secure keychain pointer.
- Generation job: stable input contract, compiled vendor prompt, vendor payload, status, polling URL, output URL, cost.

## AI Operating Contract

The stable object is not the prompt template. The stable object is structured job data:

```text
VideoGenerationJob
  -> user prompt
  -> workspace settings
  -> references
  -> creative controls
  -> conversation memory
  -> compiled vendor prompt
  -> vendor API payload
```

The system impact can change over time without breaking old jobs:

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

This lets the product improve quietly. Users can give imperfect prompts, the workspace fills in missing direction where reasonable, and the compiler creates a cleaner vendor-ready request without forcing a long questionnaire.

## MVP Scope

- Bring-your-own OpenRouter key.
- Vendor adapter pattern starting with OpenRouter video generation.
- Conversation memory that loads video skills before generation.
- Stable generation job contract separate from the evolving prompt compiler.
- Import video/images/audio into a local media bin.
- Generated outputs become reusable project assets.
- Reply/refer to previous videos in the same conversation.
- Simple timeline with reorder, trim start/end, delete segment, title clip, and export placeholder.

## Desktop Scope

- Move API keys from browser storage to OS keychain.
- Move app state from browser localStorage to SQLite.
- Store assets and generated files in project folders.
- Add FFmpeg commands for trim, split, concat, audio mix, logo overlay, title/text overlay, and final export.
- Add real Tauri file pickers for import and output folder selection.
