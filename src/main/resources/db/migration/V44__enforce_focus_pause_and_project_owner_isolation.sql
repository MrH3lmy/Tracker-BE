-- Closes two more of V42's deliberately-excluded gaps.

-- focus_session_pauses had no user_id column at all, so there was nothing to build a composite
-- key from yet. Add and backfill it from the owning focus_sessions row, then apply the same
-- composite-FK pattern used everywhere else.
ALTER TABLE focus_session_pauses ADD COLUMN user_id BIGINT REFERENCES users(id);

UPDATE focus_session_pauses fsp
SET user_id = fs.user_id
FROM focus_sessions fs
WHERE fsp.session_id = fs.id;

ALTER TABLE focus_session_pauses ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_focus_session_pauses_user_id ON focus_session_pauses (user_id);

ALTER TABLE focus_sessions ADD CONSTRAINT uq_focus_sessions_user_id_id UNIQUE (user_id, id);

ALTER TABLE focus_session_pauses ADD CONSTRAINT fk_focus_session_pauses_owned_session FOREIGN KEY (user_id, session_id) REFERENCES focus_sessions (user_id, id) NOT VALID;
ALTER TABLE focus_session_pauses VALIDATE CONSTRAINT fk_focus_session_pauses_owned_session;

-- projects.owner_user_id was never a real FK (no REFERENCES clause). In practice
-- ProjectService.create always sets it equal to the project's own user_id (see ProjectService),
-- so this backfills any legacy/null rows the same way and makes that invariant an enforced FK to
-- the global users table (not a tenant-composite FK - unlike the child-table relationships V42
-- covers, this one already points at the top-level users table, not another user-owned row).
UPDATE projects SET owner_user_id = user_id WHERE owner_user_id IS NULL;

ALTER TABLE projects ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects_owner_user FOREIGN KEY (owner_user_id) REFERENCES users (id) NOT VALID;
ALTER TABLE projects VALIDATE CONSTRAINT fk_projects_owner_user;
