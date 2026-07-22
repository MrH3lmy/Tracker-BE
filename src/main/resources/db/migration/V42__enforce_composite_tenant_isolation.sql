-- Enforces tenant isolation at the database level for relationships between user-owned entities.
-- Application-level ownership checks (see TaskService.requireOwnedTask and friends) are necessary
-- but not sufficient on their own: a missed service-layer validation could otherwise create a
-- cross-user relationship (e.g. Alice's task pointing at Bob's project) that the database itself
-- would happily accept, since the existing FKs only check that the referenced *id* exists, not
-- that it's owned by the same user as the referencing row.
--
-- Strategy: give every referenced (parent) table a UNIQUE (user_id, id) key, then replace the
-- plain single-column FK on each child table with a composite FK against (user_id, <fk column>).
-- A composite FK with the default MATCH SIMPLE behavior is automatically satisfied whenever the
-- FK column itself is NULL, regardless of user_id, so nullable relationships (e.g. notes.task_id,
-- focus_sessions.task_id) keep working exactly as before for NULL values.
--
-- Excluded from this migration, deliberately:
--   - tasks.board_column_id -> board_columns, and board_columns.board_id -> boards: both boards
--     and board_columns have a permanently NULL user_id (see V29's comment) because there is no
--     per-user board-provisioning feature yet. Enforcing a composite FK here today would reject
--     every task that already has a board_column_id set, since board_columns.user_id is NULL for
--     every existing row. This needs its own migration once per-user board provisioning exists.
--   - reminders.reference_id: polymorphic (points at either a task or a habit depending on
--     `kind`), so a single composite FK can't express it. Would need per-kind partial FKs/checks
--     or a trigger if this is wanted later.
--   - projects.owner_user_id: not a real FK today (no REFERENCES clause in the original
--     migration or JPA mapping) - out of scope for this issue, which is about existing FKs that
--     are missing ownership enforcement, not about adding new FKs from scratch.
--   - focus_session_pauses.session_id -> focus_sessions: focus_session_pauses has no user_id
--     column at all, so there's nothing to build a composite key from yet.

-- Step 1: fail loudly, with actionable diagnostics, if any existing row already crosses a tenant
-- boundary. Composite FKs can't be added if violating rows exist, and silently deleting or
-- reassigning them would be an unreviewed, potentially destructive guess at the "correct" owner -
-- resolve these by hand (see the "Migration immutability policy" section in README.md for the
-- general pattern: a follow-up migration, not editing this one, once a fix is decided).
DO $$
DECLARE
    check_row RECORD;
    violation_count BIGINT;
BEGIN
    FOR check_row IN
        SELECT * FROM (VALUES
            ('tasks', 'parent_task_id', 'tasks'),
            ('tasks', 'project_id', 'projects'),
            ('task_dependencies', 'task_id', 'tasks'),
            ('task_dependencies', 'blocks_task_id', 'tasks'),
            ('task_schedules', 'task_id', 'tasks'),
            ('habit_schedules', 'habit_id', 'habits'),
            ('habit_check_ins', 'habit_id', 'habits'),
            ('notes', 'task_id', 'tasks'),
            ('notes', 'collection_id', 'note_collections'),
            ('note_blocks', 'note_id', 'notes'),
            ('note_attachments', 'note_id', 'notes'),
            ('note_task_links', 'note_id', 'notes'),
            ('note_task_links', 'task_id', 'tasks'),
            ('note_task_links', 'note_block_id', 'note_blocks'),
            ('note_versions', 'note_id', 'notes'),
            ('note_ai_generations', 'note_id', 'notes'),
            ('notification_outbox', 'reminder_id', 'reminders'),
            ('focus_sessions', 'task_id', 'tasks'),
            ('weekly_reviews', 'linked_note_id', 'notes'),
            ('milestones', 'project_id', 'projects')
        ) AS pairs(child_table, fk_column, parent_table)
    LOOP
        EXECUTE format(
            'SELECT COUNT(*) FROM %I c JOIN %I p ON c.%I = p.id WHERE c.%I IS NOT NULL AND c.user_id <> p.user_id',
            check_row.child_table, check_row.parent_table, check_row.fk_column, check_row.fk_column
        ) INTO violation_count;
        IF violation_count > 0 THEN
            RAISE EXCEPTION 'Cross-user reference found: %.% has % row(s) whose % points to a row in % owned by a different user. Resolve these manually before re-running this migration - do not weaken this check.',
                check_row.child_table, check_row.fk_column, violation_count, check_row.fk_column, check_row.parent_table;
        END IF;
    END LOOP;
END $$;

-- Step 2: composite unique keys on every table referenced by id from another user-owned table.
ALTER TABLE tasks ADD CONSTRAINT uq_tasks_user_id_id UNIQUE (user_id, id);
ALTER TABLE projects ADD CONSTRAINT uq_projects_user_id_id UNIQUE (user_id, id);
ALTER TABLE habits ADD CONSTRAINT uq_habits_user_id_id UNIQUE (user_id, id);
ALTER TABLE notes ADD CONSTRAINT uq_notes_user_id_id UNIQUE (user_id, id);
ALTER TABLE note_blocks ADD CONSTRAINT uq_note_blocks_user_id_id UNIQUE (user_id, id);
ALTER TABLE note_collections ADD CONSTRAINT uq_note_collections_user_id_id UNIQUE (user_id, id);
ALTER TABLE reminders ADD CONSTRAINT uq_reminders_user_id_id UNIQUE (user_id, id);

-- Step 3: composite foreign keys, added NOT VALID first (so adding the constraint itself doesn't
-- need to scan/lock the whole table) and validated immediately after in a separate statement.
-- Same-user inserts/updates are unaffected; a cross-user insert/update now fails with a foreign
-- key violation instead of silently succeeding.

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_owned_parent FOREIGN KEY (user_id, parent_task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE tasks VALIDATE CONSTRAINT fk_tasks_owned_parent;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_owned_project FOREIGN KEY (user_id, project_id) REFERENCES projects (user_id, id) NOT VALID;
ALTER TABLE tasks VALIDATE CONSTRAINT fk_tasks_owned_project;

ALTER TABLE task_dependencies ADD CONSTRAINT fk_task_dependencies_owned_task FOREIGN KEY (user_id, task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE task_dependencies VALIDATE CONSTRAINT fk_task_dependencies_owned_task;

ALTER TABLE task_dependencies ADD CONSTRAINT fk_task_dependencies_owned_blocks_task FOREIGN KEY (user_id, blocks_task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE task_dependencies VALIDATE CONSTRAINT fk_task_dependencies_owned_blocks_task;

ALTER TABLE task_schedules ADD CONSTRAINT fk_task_schedules_owned_task FOREIGN KEY (user_id, task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE task_schedules VALIDATE CONSTRAINT fk_task_schedules_owned_task;

ALTER TABLE habit_schedules ADD CONSTRAINT fk_habit_schedules_owned_habit FOREIGN KEY (user_id, habit_id) REFERENCES habits (user_id, id) NOT VALID;
ALTER TABLE habit_schedules VALIDATE CONSTRAINT fk_habit_schedules_owned_habit;

ALTER TABLE habit_check_ins ADD CONSTRAINT fk_habit_check_ins_owned_habit FOREIGN KEY (user_id, habit_id) REFERENCES habits (user_id, id) NOT VALID;
ALTER TABLE habit_check_ins VALIDATE CONSTRAINT fk_habit_check_ins_owned_habit;

ALTER TABLE notes ADD CONSTRAINT fk_notes_owned_task FOREIGN KEY (user_id, task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE notes VALIDATE CONSTRAINT fk_notes_owned_task;

ALTER TABLE notes ADD CONSTRAINT fk_notes_owned_collection FOREIGN KEY (user_id, collection_id) REFERENCES note_collections (user_id, id) NOT VALID;
ALTER TABLE notes VALIDATE CONSTRAINT fk_notes_owned_collection;

ALTER TABLE note_blocks ADD CONSTRAINT fk_note_blocks_owned_note FOREIGN KEY (user_id, note_id) REFERENCES notes (user_id, id) NOT VALID;
ALTER TABLE note_blocks VALIDATE CONSTRAINT fk_note_blocks_owned_note;

ALTER TABLE note_attachments ADD CONSTRAINT fk_note_attachments_owned_note FOREIGN KEY (user_id, note_id) REFERENCES notes (user_id, id) NOT VALID;
ALTER TABLE note_attachments VALIDATE CONSTRAINT fk_note_attachments_owned_note;

ALTER TABLE note_task_links ADD CONSTRAINT fk_note_task_links_owned_note FOREIGN KEY (user_id, note_id) REFERENCES notes (user_id, id) NOT VALID;
ALTER TABLE note_task_links VALIDATE CONSTRAINT fk_note_task_links_owned_note;

ALTER TABLE note_task_links ADD CONSTRAINT fk_note_task_links_owned_task FOREIGN KEY (user_id, task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE note_task_links VALIDATE CONSTRAINT fk_note_task_links_owned_task;

ALTER TABLE note_task_links ADD CONSTRAINT fk_note_task_links_owned_note_block FOREIGN KEY (user_id, note_block_id) REFERENCES note_blocks (user_id, id) NOT VALID;
ALTER TABLE note_task_links VALIDATE CONSTRAINT fk_note_task_links_owned_note_block;

ALTER TABLE note_versions ADD CONSTRAINT fk_note_versions_owned_note FOREIGN KEY (user_id, note_id) REFERENCES notes (user_id, id) NOT VALID;
ALTER TABLE note_versions VALIDATE CONSTRAINT fk_note_versions_owned_note;

ALTER TABLE note_ai_generations ADD CONSTRAINT fk_note_ai_generations_owned_note FOREIGN KEY (user_id, note_id) REFERENCES notes (user_id, id) NOT VALID;
ALTER TABLE note_ai_generations VALIDATE CONSTRAINT fk_note_ai_generations_owned_note;

ALTER TABLE notification_outbox ADD CONSTRAINT fk_notification_outbox_owned_reminder FOREIGN KEY (user_id, reminder_id) REFERENCES reminders (user_id, id) NOT VALID;
ALTER TABLE notification_outbox VALIDATE CONSTRAINT fk_notification_outbox_owned_reminder;

ALTER TABLE focus_sessions ADD CONSTRAINT fk_focus_sessions_owned_task FOREIGN KEY (user_id, task_id) REFERENCES tasks (user_id, id) NOT VALID;
ALTER TABLE focus_sessions VALIDATE CONSTRAINT fk_focus_sessions_owned_task;

ALTER TABLE weekly_reviews ADD CONSTRAINT fk_weekly_reviews_owned_note FOREIGN KEY (user_id, linked_note_id) REFERENCES notes (user_id, id) NOT VALID;
ALTER TABLE weekly_reviews VALIDATE CONSTRAINT fk_weekly_reviews_owned_note;

ALTER TABLE milestones ADD CONSTRAINT fk_milestones_owned_project FOREIGN KEY (user_id, project_id) REFERENCES projects (user_id, id) NOT VALID;
ALTER TABLE milestones VALIDATE CONSTRAINT fk_milestones_owned_project;
