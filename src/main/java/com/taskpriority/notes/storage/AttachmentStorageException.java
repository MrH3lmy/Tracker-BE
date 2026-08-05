package com.taskpriority.notes.storage;

/** Wraps a lower-level storage-provider failure (I/O, SDK exception) behind a stable app-level type. */
public class AttachmentStorageException extends RuntimeException {
    public AttachmentStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
