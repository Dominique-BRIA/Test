-- Migration 003 — Hybrid weight strategy per edge
-- Adds weight_strategy column to edges table.
-- 'explicit'  : developer-supplied weight (legacy default)
-- 'temporal'  : base weight stored; decay applied at scoring time via applyTemporalDecay()
-- 'auto'      : weight inferred at creation time from interaction frequency in this workspace

ALTER TABLE edges
  ADD COLUMN IF NOT EXISTS weight_strategy TEXT NOT NULL DEFAULT 'explicit'
  CHECK (weight_strategy IN ('explicit', 'temporal', 'auto'));

CREATE INDEX IF NOT EXISTS idx_edges_weight_strategy ON edges (weight_strategy);
