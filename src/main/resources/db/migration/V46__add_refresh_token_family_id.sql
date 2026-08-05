-- Refresh-token rotation currently detects reuse of an already-consumed token and rejects it,
-- but does nothing further: if an attacker has stolen an old refresh token and replays it after
-- the legitimate client has already rotated past it, only that one replayed request is rejected -
-- the legitimate session descended from it (and any further descendants) stays valid. Add a
-- family_id shared by every session descended from the same original login/registration so a
-- detected replay can revoke the whole chain, not just the one presented token (issue #257).
ALTER TABLE user_sessions ADD COLUMN family_id UUID;

-- Existing rows have no recorded lineage - treat each as the root of its own single-member family
-- rather than guessing a shared ancestor.
UPDATE user_sessions SET family_id = gen_random_uuid() WHERE family_id IS NULL;

ALTER TABLE user_sessions ALTER COLUMN family_id SET NOT NULL;
CREATE INDEX idx_user_sessions_family_id ON user_sessions (family_id);
