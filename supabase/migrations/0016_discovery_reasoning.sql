-- Holds the LLM's actual justification for a market-intelligence proposal
-- (lib/market-intelligence.ts's evaluateProductFit) -- kept separate from
-- flag_reason (a short categorical label shared with the archive-flagging
-- job) and description (reader-facing marketing copy an admin edits
-- directly). Admin-facing context only, shown in the assets board.
alter table affiliate_products
  add column if not exists discovery_reasoning text;
