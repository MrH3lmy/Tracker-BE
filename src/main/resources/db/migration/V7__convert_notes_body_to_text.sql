DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notes'
          AND column_name = 'body'
          AND data_type = 'bytea'
    ) THEN
        EXECUTE 'ALTER TABLE notes ALTER COLUMN body TYPE TEXT USING convert_from(body, ''UTF8'')';
    END IF;
END $$;
