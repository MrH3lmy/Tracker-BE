-- Issue #288: lightweight, append-only project activity timeline. NOT event sourcing - the
-- existing domain tables (tasks/notes/projects) remain the source of truth for current state;
-- this table only records that something happened, for a chronological "what changed" feed.
CREATE TABLE project_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    summary VARCHAR(500) NOT NULL,
    metadata TEXT,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The one query this table exists to serve: "page through this project's activity, newest first,
-- with a stable tiebreaker for rows sharing a timestamp." Leading with project_id keeps every
-- lookup scoped to one project before touching occurred_at/id, matching how every other
-- project-scoped composite index in this schema (idx_tasks_user_id_project_id, V47) is shaped.
CREATE INDEX idx_project_activities_project_occurred_id ON project_activities (project_id, occurred_at DESC, id DESC);

-- Tenant isolation (V42 pattern): a project_activities row's project must belong to the same user
-- who owns the row itself, enforced at the database level, not just in ProjectActivityService.
ALTER TABLE project_activities ADD CONSTRAINT fk_project_activities_owned_project
    FOREIGN KEY (user_id, project_id) REFERENCES projects (user_id, id);
