-- app_settings currently has one global row per setting_key. Rebuild its primary key as
-- (user_id, setting_key) so each user has an independent copy of their settings.
ALTER TABLE app_settings ADD COLUMN user_id BIGINT REFERENCES users(id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM app_settings) THEN
        RAISE EXCEPTION 'V30 refuses to run: app_settings already contains rows with no user_id assigned. Manually backfill user_id before re-running this migration.';
    END IF;
END $$;

ALTER TABLE app_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE app_settings ADD CONSTRAINT pk_app_settings PRIMARY KEY (user_id, setting_key);
