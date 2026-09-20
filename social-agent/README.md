# /social-agent

Portable core of the 24/7 social media manager agent add-on. Full design:
[docs/research/social-media-manager-agent.md](../docs/research/social-media-manager-agent.md).

## Why this directory exists, and why it isn't under `lib/`

Everything in `lib/` today is allowed to call `createSupabaseAdminClient()`
and read `process.env.X` inline, and does. That's fine for this repo's
existing article/affiliate features, which are meant to live here
permanently. This feature is different: the research doc's Scoping and
Modularity sections conclude it's architecturally a standalone product
(multi-tenant decision engine + state orchestrator + its own six-layer
memory) that happens to be *hosted* in this repo for now, not a feature of
phugialy.com's blog. It needs to stay cheaply separable if it ever grows
into its own repo/app -- see the graduation path in the research doc.

A `lib/social/` folder that still directly imports
`@supabase/supabase-js` and reads env vars inline would be *tidy* but not
*portable* -- copying it into a new repo wouldn't run until every one of
those calls got rewritten. Putting the core logic in a genuine top-level
directory, structurally separate from `lib/`, makes the boundary visible
during a `git rm -r`, a copy into a new repo, or a "did this break the
portfolio site or not" debugging session -- not just a naming convention
that's easy to violate by accident.

## The rule

**Everything under `/social-agent/` may only depend on the interfaces
defined in `ports.ts` (`LLM`, `Store`, `Platform`, `AuthGate`) plus plain
TypeScript/JS. Never on `@supabase/supabase-js`, never on `process.env.*`,
never on a Next.js import, never on anything under `lib/` or `app/`.**

The dependency arrow only ever points one way:

```
app/  (thin host-glue: concrete adapters, routes)
  │
  ▼ implements/instantiates
social-agent/ports.ts  (interfaces only)
  ▲
  │ depends only on
social-agent/  (pipeline steps, state machine, prompts -- Phase 2+)
```

Concrete implementations of these ports -- a Supabase-backed `Store`, an
OpenRouter-backed `LLM`, an `isAuthorizedCronRequest`-backed `AuthGate`,
and later a Zernio-backed `Platform` -- live under `app/` as thin
"host-glue" files, instantiated once and passed into `/social-agent/`
functions as plain parameters. Not a DI framework, not a plugin registry
-- that would be over-engineering the same thing this project's research
doc rejects everywhere else (n8n/LangGraph/Temporal, a standing personal
agent framework, etc.). Just parameters.

A bug that lives entirely inside `/social-agent/` is provably not a
Supabase, Vercel, or portfolio-site problem -- that provability is the
actual point of the boundary, not a style preference.

## Current contents (Phase 0)

- `ports.ts` -- the four port interfaces. No implementations here; see
  `app/social-agent-adapters/` for those.

Everything else (`pipeline/` steps, prompt templates, the
`social_posts.status` state machine) is Phase 2+ and doesn't exist yet --
see the Phased build plan in the research doc for what's coming and in
what order.
