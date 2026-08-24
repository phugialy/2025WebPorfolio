# Article Agent Pipeline

This system is additive. Existing admin workflows still work, but generated articles can carry richer agent packages in `raw_payload`.

## Flow

Strategist -> Research Agent -> Writer Agent -> Critic Agent -> Writer Revision Pass -> Image Director -> Image Generator -> Workspace Review -> Publish

## Role Boundaries

- Strategist defines the mission.
- Research protects truth.
- Writer protects meaning and readability.
- Human touch protects identity.
- Critic protects reader trust and publishing quality.
- Image Director protects visual usefulness.
- Human admin makes the final call.

## Rewrite Limit

Automatic writer revisions are limited to 2 passes.

If the critic still requests revision after 2 rewrites, save the article as a draft with a warning that human review is required.

