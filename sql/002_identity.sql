-- Identity layer: users, sessions, workspace ownership, usage tracking

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Lightweight request log: workspace_id comes from the API-key guard
CREATE TABLE usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  method       TEXT NOT NULL DEFAULT 'POST',
  status_code  INT,
  latency_ms   INT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_token  ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_user   ON user_sessions(user_id);
CREATE INDEX idx_usage_logs_workspace ON usage_logs(workspace_id, created_at DESC);
CREATE INDEX idx_usage_logs_created   ON usage_logs(created_at DESC);
