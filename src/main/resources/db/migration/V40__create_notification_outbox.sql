CREATE TABLE notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    reminder_id BIGINT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    link VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_outbox_reminder_channel UNIQUE (reminder_id, channel)
);

CREATE INDEX idx_notification_outbox_user_id ON notification_outbox (user_id);
CREATE INDEX idx_notification_outbox_status ON notification_outbox (status);
