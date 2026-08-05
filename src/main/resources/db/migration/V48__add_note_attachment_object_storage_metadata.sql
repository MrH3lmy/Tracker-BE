-- Note attachment binaries currently live only in note_attachments.data (bytea), fully buffered
-- into memory on every upload/download - see issue #261. This adds nullable object-storage
-- metadata without touching any already-applied migration or existing row: every existing
-- attachment gets storage_provider='DATABASE' (its actual, unchanged storage location) and no
-- checksum. New uploads made while app.storage.s3.enabled=true (see AttachmentStorageConfig) are
-- written to S3/MinIO instead, with data left NULL and storage_key repurposed from an unused
-- random UUID into the real object key.
ALTER TABLE note_attachments ADD COLUMN storage_provider VARCHAR(20) NOT NULL DEFAULT 'DATABASE';
ALTER TABLE note_attachments ADD COLUMN checksum_sha256 VARCHAR(64);
ALTER TABLE note_attachments ALTER COLUMN data DROP NOT NULL;

ALTER TABLE note_attachments ADD CONSTRAINT chk_note_attachments_storage_provider
    CHECK (storage_provider IN ('DATABASE', 'S3'));

-- A DATABASE-provider row must still carry its bytes; only an S3-provider row is allowed to have
-- a NULL data column. Keeps the nullable relaxation above from silently admitting a legacy-mode
-- row with no bytes anywhere.
ALTER TABLE note_attachments ADD CONSTRAINT chk_note_attachments_data_present_unless_s3
    CHECK (storage_provider = 'S3' OR data IS NOT NULL);
