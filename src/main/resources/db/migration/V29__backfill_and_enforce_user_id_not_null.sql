-- This app is pre-launch: there is no real multi-user production data to backfill yet.
-- Rather than silently guessing how to assign existing rows to a bootstrap user, this
-- migration asserts every affected table is empty and fails loudly otherwise. If it fails
-- in your environment, STOP and manually backfill user_id on the flagged table(s) to a
-- deliberately chosen owner before re-running - do not weaken this check.
DO $$
DECLARE
    non_empty_tables text := '';
BEGIN
    IF EXISTS (SELECT 1 FROM tasks) THEN non_empty_tables := non_empty_tables || 'tasks '; END IF;
    IF EXISTS (SELECT 1 FROM boards) THEN non_empty_tables := non_empty_tables || 'boards '; END IF;
    IF EXISTS (SELECT 1 FROM board_columns) THEN non_empty_tables := non_empty_tables || 'board_columns '; END IF;
    IF EXISTS (SELECT 1 FROM task_dependencies) THEN non_empty_tables := non_empty_tables || 'task_dependencies '; END IF;
    IF EXISTS (SELECT 1 FROM task_schedules) THEN non_empty_tables := non_empty_tables || 'task_schedules '; END IF;
    IF EXISTS (SELECT 1 FROM task_check_ins) THEN non_empty_tables := non_empty_tables || 'task_check_ins '; END IF;
    IF EXISTS (SELECT 1 FROM habits) THEN non_empty_tables := non_empty_tables || 'habits '; END IF;
    IF EXISTS (SELECT 1 FROM habit_schedules) THEN non_empty_tables := non_empty_tables || 'habit_schedules '; END IF;
    IF EXISTS (SELECT 1 FROM habit_check_ins) THEN non_empty_tables := non_empty_tables || 'habit_check_ins '; END IF;
    IF EXISTS (SELECT 1 FROM notes) THEN non_empty_tables := non_empty_tables || 'notes '; END IF;
    IF EXISTS (SELECT 1 FROM tags) THEN non_empty_tables := non_empty_tables || 'tags '; END IF;
    IF EXISTS (SELECT 1 FROM note_collections) THEN non_empty_tables := non_empty_tables || 'note_collections '; END IF;
    IF EXISTS (SELECT 1 FROM note_templates) THEN non_empty_tables := non_empty_tables || 'note_templates '; END IF;
    IF EXISTS (SELECT 1 FROM note_saved_views) THEN non_empty_tables := non_empty_tables || 'note_saved_views '; END IF;
    IF EXISTS (SELECT 1 FROM note_attachments) THEN non_empty_tables := non_empty_tables || 'note_attachments '; END IF;
    IF EXISTS (SELECT 1 FROM note_blocks) THEN non_empty_tables := non_empty_tables || 'note_blocks '; END IF;
    IF EXISTS (SELECT 1 FROM note_task_links) THEN non_empty_tables := non_empty_tables || 'note_task_links '; END IF;
    IF EXISTS (SELECT 1 FROM note_ai_generations) THEN non_empty_tables := non_empty_tables || 'note_ai_generations '; END IF;
    IF EXISTS (SELECT 1 FROM note_versions) THEN non_empty_tables := non_empty_tables || 'note_versions '; END IF;

    IF non_empty_tables <> '' THEN
        RAISE EXCEPTION 'V29 refuses to run: the following tables already contain rows with no user_id assigned: %. Manually backfill user_id on these rows to a deliberately chosen owner before re-running this migration.', non_empty_tables;
    END IF;
END $$;

ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE boards ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE board_columns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE task_schedules ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE task_check_ins ALTER COLUMN user_id SET NOT NULL;
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
