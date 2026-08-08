-- Native auth contract (issue #257): sessions now record which channel issued them (browser
-- cookie flow vs. a dedicated native route) as descriptive device metadata, surfaced through the
-- session-listing endpoint. 'WEB' is a constant default, so unlike V46's family_id backfill this
-- can be a single statement - every existing row predates the native contract and was issued
-- through the browser flow.
ALTER TABLE user_sessions ADD COLUMN platform VARCHAR(16) NOT NULL DEFAULT 'WEB';
