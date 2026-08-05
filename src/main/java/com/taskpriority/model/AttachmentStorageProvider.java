package com.taskpriority.model;

/** Where a {@link NoteAttachment}'s bytes actually live - see V48 and issue #261. */
public enum AttachmentStorageProvider {
    /** Bytes are in {@code note_attachments.data} (bytea) - the original, still-default behavior. */
    DATABASE,
    /** Bytes are in the S3-compatible bucket configured via {@code app.storage.s3.*}. */
    S3
}
