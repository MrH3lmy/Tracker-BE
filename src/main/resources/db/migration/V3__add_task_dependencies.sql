CREATE TABLE task_dependencies (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    blocks_task_id BIGINT NOT NULL,
    dependency_type VARCHAR(40) NOT NULL DEFAULT 'BLOCKS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_dependencies_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_task_dependencies_blocks_task
        FOREIGN KEY (blocks_task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE,
    CONSTRAINT uk_task_dependencies_pair UNIQUE (task_id, blocks_task_id),
    CONSTRAINT chk_task_dependencies_not_self CHECK (task_id <> blocks_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_blocks_task_id ON task_dependencies(blocks_task_id);
