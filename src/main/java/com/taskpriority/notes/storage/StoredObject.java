package com.taskpriority.notes.storage;

/** Result of a successful {@link AttachmentStorage#put} - the caller verifies size/checksum against what it asked for. */
public record StoredObject(String objectKey, long sizeBytes, String checksumSha256) {
}
