package com.taskpriority.notes.storage;

import java.io.InputStream;

/**
 * Object-storage abstraction for note attachment binaries (issue #261) - PostgreSQL keeps
 * attachment metadata and authorization relationships (see {@code NoteAttachment}); this is only
 * ever handed opaque bytes and an object key, never a user id or note id, so it stays swappable
 * for a different S3-compatible provider without touching {@code NoteService}.
 */
public interface AttachmentStorage {

    /**
     * Uploads {@code contentLength} bytes from {@code content} under {@code objectKey}. Callers
     * must know the length upfront (a {@code MultipartFile} always does) so this never has to
     * buffer the whole stream in memory to compute it first.
     */
    StoredObject put(String objectKey, InputStream content, long contentLength, String contentType);

    /** Streams the object back. Caller is responsible for closing the returned stream. */
    InputStream get(String objectKey);

    /** Best-effort delete; implementations should treat "already gone" as success, not an error. */
    void delete(String objectKey);
}
