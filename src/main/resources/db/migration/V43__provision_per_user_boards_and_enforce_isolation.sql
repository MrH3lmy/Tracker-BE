-- Closes the boards/board_columns gap V42 deliberately excluded: until now there was no
-- per-user board provisioning, so every board/board_column row had a permanently NULL user_id
-- (see V29's comment), and a composite FK would have rejected every task that already has a
-- board_column_id set. BoardProvisioningService now creates a board+columns for every *new* user
-- at registration; this migration backfills the same layout for every *existing* user, repoints
-- their tasks at their own columns (matched by status), retires the old globally-shared board,
-- and then enforces the same composite-FK pattern V42 used for every other relationship.

-- Step 1: give every existing user their own board + the same 7 columns V2 originally seeded
-- once, globally. Idempotent (skips a user who already has a board) so re-running this migration
-- against a partially-migrated database is safe.
DO $$
DECLARE
    account RECORD;
    new_board_id BIGINT;
    col RECORD;
BEGIN
    FOR account IN SELECT id FROM users LOOP
        CONTINUE WHEN EXISTS (SELECT 1 FROM boards WHERE user_id = account.id);

        INSERT INTO boards (user_id, name) VALUES (account.id, 'Default Board') RETURNING id INTO new_board_id;

        FOR col IN
            SELECT * FROM (VALUES
                ('Backlog', 'BACKLOG', 1000),
                ('Not Started', 'NOT_STARTED', 2000),
                ('In Progress', 'IN_PROGRESS', 3000),
                ('Waiting', 'WAITING', 4000),
                ('Blocked', 'BLOCKED', 5000),
                ('Done', 'DONE', 6000),
                ('Cancelled', 'CANCELLED', 7000)
            ) AS layout(col_name, col_status, col_position)
        LOOP
            INSERT INTO board_columns (user_id, board_id, name, status, position)
            VALUES (account.id, new_board_id, col.col_name, col.col_status, col.col_position);
        END LOOP;
    END LOOP;
END $$;

-- Step 2: repoint every task at its own user's column with the same status as its current
-- column. Covers the common case: every pre-existing board_column_id came from the single global
-- board V2 seeded, which had exactly one column per status.
UPDATE tasks t
SET board_column_id = new_bc.id
FROM board_columns old_bc, board_columns new_bc
WHERE t.board_column_id = old_bc.id
  AND new_bc.status = old_bc.status
  AND new_bc.user_id = t.user_id
  AND old_bc.user_id IS DISTINCT FROM t.user_id;

-- Anything still pointing at a column that isn't its own user's (e.g. a legacy column with no
-- user-scoped counterpart) falls back to null rather than blocking this migration on data that
-- predates any documented board-column contract.
UPDATE tasks t
SET board_column_id = NULL
WHERE t.board_column_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM board_columns bc WHERE bc.id = t.board_column_id AND bc.user_id = t.user_id);

-- Step 3: the old globally-shared board/columns (NULL user_id, seeded once by V2) are now
-- unreferenced - remove them so every remaining row has a real owner and NOT NULL can be enforced.
DELETE FROM board_columns WHERE user_id IS NULL;
DELETE FROM boards WHERE user_id IS NULL;

ALTER TABLE boards ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE board_columns ALTER COLUMN user_id SET NOT NULL;

-- Step 4: same composite-FK pattern as V42.
ALTER TABLE boards ADD CONSTRAINT uq_boards_user_id_id UNIQUE (user_id, id);
ALTER TABLE board_columns ADD CONSTRAINT uq_board_columns_user_id_id UNIQUE (user_id, id);

ALTER TABLE board_columns ADD CONSTRAINT fk_board_columns_owned_board FOREIGN KEY (user_id, board_id) REFERENCES boards (user_id, id) NOT VALID;
ALTER TABLE board_columns VALIDATE CONSTRAINT fk_board_columns_owned_board;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_owned_board_column FOREIGN KEY (user_id, board_column_id) REFERENCES board_columns (user_id, id) NOT VALID;
ALTER TABLE tasks VALIDATE CONSTRAINT fk_tasks_owned_board_column;
