CREATE TABLE note_task_links (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    note_block_id BIGINT REFERENCES note_blocks(id) ON DELETE CASCADE,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    selected_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_note_task_links_note_id ON note_task_links(note_id);
CREATE INDEX idx_note_task_links_block_id ON note_task_links(note_block_id);
CREATE INDEX idx_note_task_links_task_id ON note_task_links(task_id);
