-- Real installs that predate per-user accounts (V26-28 added the users table and the
-- nullable user_id FKs without retroactively assigning ownership) have rows in these
-- tables with no user_id. A single-tenant install only ever had one implicit owner, so
-- assign all such legacy rows to a bootstrap account - the oldest existing user if one
-- has already registered, otherwise a newly created placeholder - rather than refusing
-- to start and forcing a manual SQL fixup on every affected database.
--
-- boards/board_columns are deliberately excluded from this backfill (and from the
-- NOT NULL enforcement below): V2 unconditionally seeds a single global "Default Board"
-- and its 7 status columns on every install, predating per-user accounts entirely, and
-- the app has no per-user board-provisioning feature yet to give that row a real owner.
-- Enforcing NOT NULL on user_id there today would make V29 fail on every fresh install
-- and every upgrade from V27, with no legitimate owner to backfill it to.
DO $$
DECLARE
    bootstrap_user_id BIGINT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM tasks WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM task_dependencies WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM task_schedules WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM habits WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM habit_schedules WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM habit_check_ins WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM notes WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM tags WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_collections WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_templates WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_saved_views WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_attachments WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_blocks WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_task_links WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_ai_generations WHERE user_id IS NULL
        UNION ALL SELECT 1 FROM note_versions WHERE user_id IS NULL
    ) THEN
        SELECT id INTO bootstrap_user_id FROM users ORDER BY id ASC LIMIT 1;
        IF bootstrap_user_id IS NULL THEN
            INSERT INTO users (email, password_hash, display_name)
            VALUES ('legacy-data-owner@local.invalid', '!migration-bootstrap-account-cannot-login!', 'Legacy Data Owner')
            RETURNING id INTO bootstrap_user_id;
        END IF;

        UPDATE tasks SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE task_dependencies SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE task_schedules SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE habits SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE habit_schedules SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE habit_check_ins SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE notes SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE tags SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_collections SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_templates SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_saved_views SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_attachments SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_blocks SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_task_links SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_ai_generations SET user_id = bootstrap_user_id WHERE user_id IS NULL;
        UPDATE note_versions SET user_id = bootstrap_user_id WHERE user_id IS NULL;
    END IF;
END $$;

ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE task_schedules ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE habits ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE habit_schedules ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE habit_check_ins ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_collections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_templates ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_saved_views ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_attachments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_blocks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_task_links ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_ai_generations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE note_versions ALTER COLUMN user_id SET NOT NULL;
