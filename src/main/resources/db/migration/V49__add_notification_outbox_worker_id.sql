-- Tracks which application instance claimed each outbox entry, so a stuck/recovered entry (see
-- recoverStuckProcessing) or a duplicate-processing incident can be traced back to a specific
-- worker instead of just "some instance, at some point" (issue #255 - horizontally scaled outbox
-- dispatch had no per-worker attribution at all).
ALTER TABLE notification_outbox ADD COLUMN worker_id VARCHAR(100);
CREATE INDEX idx_notification_outbox_worker_id ON notification_outbox (worker_id);
