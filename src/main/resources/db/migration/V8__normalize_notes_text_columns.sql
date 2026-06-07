DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'notes'
          AND column_name = 'title'
          AND data_type = 'bytea'
    ) THEN
        EXECUTE 'ALTER TABLE notes ALTER COLUMN title TYPE TEXT USING convert_from(title, ''UTF8'')';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'notes'
          AND column_name = 'body'
          AND data_type = 'bytea'
    ) THEN
        EXECUTE 'ALTER TABLE notes ALTER COLUMN body TYPE TEXT USING convert_from(body, ''UTF8'')';
    END IF;
END $$;
