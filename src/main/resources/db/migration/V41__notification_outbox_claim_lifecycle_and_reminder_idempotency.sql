-- Adds a claim-before-send lifecycle to notification_outbox (PENDING -> PROCESSING -> SENT, with
-- PROCESSING -> PENDING for retry or PROCESSING -> FAILED as the dead-letter state after
-- max_attempts) so two dispatcher instances can never both "send" the same row, and so a crashed
-- dispatcher's claimed-but-unfinished rows can be recovered after a lease timeout instead of
-- being stuck in PROCESSING forever.
ALTER TABLE notification_outbox ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5;
ALTER TABLE notification_outbox ADD COLUMN processing_started_at TIMESTAMP;
ALTER TABLE notification_outbox ADD COLUMN processed_at TIMESTAMP;
ALTER TABLE notification_outbox ADD COLUMN last_error_code VARCHAR(50);
ALTER TABLE notification_outbox ADD COLUMN last_error_message VARCHAR(500);

-- Existing rows never had next_attempt_at set (the pre-claim-lifecycle code always left it null),
-- so the claim query's "next_attempt_at <= now()" predicate would otherwise never match them.
UPDATE notification_outbox SET next_attempt_at = created_at WHERE next_attempt_at IS NULL;
ALTER TABLE notification_outbox ALTER COLUMN next_attempt_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE notification_outbox ALTER COLUMN next_attempt_at SET NOT NULL;

CREATE INDEX idx_notification_outbox_status_next_attempt ON notification_outbox (status, next_attempt_at);

-- Deterministic per-occurrence idempotency key for reminders, so two producer instances racing to
-- create the same occurrence (same user, kind, reference, day) can never both succeed even if both
-- pass the application-level existsBy... pre-check - the unique constraint is the real guarantee.
ALTER TABLE reminders ADD COLUMN idempotency_key VARCHAR(255);

-- Legacy rows predate this column and were created back when only the (weaker) existsBy... check
-- guarded against duplicates; backfill each with a key derived from its own id so it's guaranteed
-- unique without asserting anything about whether duplicates already existed among them.
UPDATE reminders SET idempotency_key = 'legacy-' || id WHERE idempotency_key IS NULL;

ALTER TABLE reminders ALTER COLUMN idempotency_key SET NOT NULL;
ALTER TABLE reminders ADD CONSTRAINT uq_reminders_idempotency_key UNIQUE (idempotency_key);
