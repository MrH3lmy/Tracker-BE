CREATE TABLE task_check_ins (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_check_ins_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_task_check_ins_task_date ON task_check_ins(task_id, check_in_date);
