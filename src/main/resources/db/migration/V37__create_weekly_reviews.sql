CREATE TABLE weekly_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    week_start_date DATE NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    summary TEXT,
    linked_note_id BIGINT REFERENCES notes(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weekly_reviews_user_id ON weekly_reviews (user_id);
CREATE INDEX idx_weekly_reviews_week_start_date ON weekly_reviews (week_start_date);
