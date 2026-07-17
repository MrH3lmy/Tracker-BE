-- priority_scoring_settings currently has one global row per setting_name. Rescope its
-- uniqueness to (user_id, setting_name) so each user has independent scoring weights.
ALTER TABLE priority_scoring_settings ADD COLUMN user_id BIGINT REFERENCES users(id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM priority_scoring_settings) THEN
        RAISE EXCEPTION 'V31 refuses to run: priority_scoring_settings already contains rows with no user_id assigned. Manually backfill user_id before re-running this migration.';
    END IF;
END $$;

ALTER TABLE priority_scoring_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE priority_scoring_settings DROP CONSTRAINT priority_scoring_settings_setting_name_key;
ALTER TABLE priority_scoring_settings ADD CONSTRAINT uk_priority_scoring_settings_user_setting UNIQUE (user_id, setting_name);
