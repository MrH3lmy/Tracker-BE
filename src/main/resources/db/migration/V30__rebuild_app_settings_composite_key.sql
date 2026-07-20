-- app_settings currently has one global row per setting_key. Rebuild its primary key as
-- (user_id, setting_key) so each user has an independent copy of their settings.
ALTER TABLE app_settings ADD COLUMN user_id BIGINT REFERENCES users(id);

-- Pre-existing rows predate per-user accounts (see V29's comment for the full
-- rationale) - assign them to the same kind of single bootstrap owner rather
-- than refusing to start.
DO $$
DECLARE
    bootstrap_user_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM app_settings WHERE user_id IS NULL) THEN
        SELECT id INTO bootstrap_user_id FROM users ORDER BY id ASC LIMIT 1;
        IF bootstrap_user_id IS NULL THEN
            INSERT INTO users (email, password_hash, display_name)
            VALUES ('legacy-data-owner@local.invalid', '!migration-bootstrap-account-cannot-login!', 'Legacy Data Owner')
            RETURNING id INTO bootstrap_user_id;
        END IF;

        UPDATE app_settings SET user_id = bootstrap_user_id WHERE user_id IS NULL;
    END IF;
END $$;

ALTER TABLE app_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE app_settings ADD CONSTRAINT pk_app_settings PRIMARY KEY (user_id, setting_key);
