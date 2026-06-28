-- PostgreSQL 15 — Initial schema for YowLinker Network Project

CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  adapter_name    TEXT NOT NULL,
  adapter_version TEXT NOT NULL DEFAULT '1.0',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked      BOOLEAN DEFAULT FALSE
);

CREATE TABLE nodes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  type         TEXT NOT NULL,
  attributes   JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE edges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  source_id    UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  weight       FLOAT DEFAULT 1.0,
  event_time   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE node_features (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  node_id      UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  version      INT DEFAULT 1,
  features     JSONB NOT NULL,
  computed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Replaces link_features: stores features for any (source, target) pair,
-- including pairs that are NOT existing edges (the common case in link prediction).
CREATE TABLE pair_features (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  source_id     UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  features      JSONB NOT NULL,
  computed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE node_embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  node_id      UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  vector       JSONB NOT NULL,
  dimension    INT NOT NULL,
  version      INT DEFAULT 1,
  computed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE models (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  name            TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL,
  training_config JSONB DEFAULT '{}'
);

CREATE TABLE predictions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  model_id     UUID REFERENCES models(id),
  source_id    UUID NOT NULL REFERENCES nodes(id),
  target_id    UUID NOT NULL REFERENCES nodes(id),
  score        FLOAT NOT NULL CHECK (score BETWEEN 0 AND 1),
  predicted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prediction_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  source_id       UUID NOT NULL REFERENCES nodes(id),
  target_id       UUID NOT NULL REFERENCES nodes(id),
  pipeline_config JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  result          JSONB,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE dead_letter_queue (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT,
  entity    TEXT,
  payload   JSONB,
  error     TEXT,
  failed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edges_source       ON edges (source_id);
CREATE INDEX idx_edges_target       ON edges (target_id);
CREATE INDEX idx_edges_type         ON edges (type);
CREATE INDEX idx_edges_time         ON edges (event_time);
CREATE INDEX idx_nodes_workspace    ON nodes (workspace_id);
CREATE INDEX idx_pair_features_pair ON pair_features (source_id, target_id);
CREATE INDEX idx_embeddings_node    ON node_embeddings (node_id, provider);
CREATE INDEX idx_jobs_workspace     ON prediction_jobs (workspace_id);
CREATE INDEX idx_jobs_status        ON prediction_jobs (status);
