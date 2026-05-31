CREATE TABLE boards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE board_columns (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    status VARCHAR(20),
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_board_columns_board
        FOREIGN KEY (board_id)
        REFERENCES boards(id)
        ON DELETE CASCADE
);

INSERT INTO boards (name) VALUES ('Default Board');

INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'Backlog', 'BACKLOG', 1000 FROM boards WHERE name = 'Default Board';
INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'Not Started', 'NOT_STARTED', 2000 FROM boards WHERE name = 'Default Board';
INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'In Progress', 'IN_PROGRESS', 3000 FROM boards WHERE name = 'Default Board';
INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'Waiting', 'WAITING', 4000 FROM boards WHERE name = 'Default Board';
INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'Blocked', 'BLOCKED', 5000 FROM boards WHERE name = 'Default Board';
INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'Done', 'DONE', 6000 FROM boards WHERE name = 'Default Board';
INSERT INTO board_columns (board_id, name, status, position)
SELECT id, 'Cancelled', 'CANCELLED', 7000 FROM boards WHERE name = 'Default Board';

ALTER TABLE tasks ADD COLUMN board_column_id BIGINT;
ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

UPDATE tasks
SET board_column_id = (
    SELECT bc.id
    FROM board_columns bc
    WHERE bc.status = tasks.status
),
position = id * 1000;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_board_column
    FOREIGN KEY (board_column_id)
    REFERENCES board_columns(id);

CREATE INDEX idx_board_columns_board_id ON board_columns(board_id);
CREATE INDEX idx_board_columns_status ON board_columns(status);
CREATE INDEX idx_tasks_board_column_id ON tasks(board_column_id);
CREATE INDEX idx_tasks_board_column_position ON tasks(board_column_id, position);
CREATE INDEX idx_tasks_status_position ON tasks(status, position);
