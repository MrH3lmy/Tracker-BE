-- priority_scoring_settings currently has one global row per setting_name. Rescope its
-- uniqueness to (user_id, setting_name) so each user has independent scoring weights.
ALTER TABLE priority_scoring_settings ADD COLUMN user_id BIGINT REFERENCES users(id);

-- Pre-existing rows predate per-user accounts (see V29's comment for the full
-- rationale) - assign them to the same kind of single bootstrap owner rather
-- than refusing to start.
DO $$
DECLARE
    bootstrap_user_id BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM priority_scoring_settings WHERE user_id IS NULL) THEN
        SELECT id INTO bootstrap_user_id FROM users ORDER BY id ASC LIMIT 1;
        IF bootstrap_user_id IS NULL THEN
            INSERT INTO users (email, password_hash, display_name)
            VALUES ('legacy-data-owner@local.invalid', '!migration-bootstrap-account-cannot-login!', 'Legacy Data Owner')
            RETURNING id INTO bootstrap_user_id;
        END IF;

        UPDATE priority_scoring_settings SET user_id = bootstrap_user_id WHERE user_id IS NULL;
    END IF;
END $$;

ALTER TABLE priority_scoring_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE priority_scoring_settings DROP CONSTRAINT priority_scoring_settings_setting_name_key;
ALTER TABLE priority_scoring_settings ADD CONSTRAINT uk_priority_scoring_settings_user_setting UNIQUE (user_id, setting_name);
