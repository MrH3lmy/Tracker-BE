package com.taskpriority.notes.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.InputStream;

/**
 * Keeps object-storage side effects consistent with the surrounding database transaction.
 *
 * <p>Uploads must happen before the attachment row can reference the object. If the database
 * transaction later rolls back (including a failure during commit), the uploaded object is removed
 * as compensation. Deletes are delayed until after the database commit so a rolled-back row delete
 * never leaves a surviving row pointing at a missing object.</p>
 *
 * <p>Object stores are not transactional resources, so an after-commit delete can still fail. That
 * failure is logged for reconciliation rather than being allowed to invalidate an already-committed
 * database transaction.</p>
 */
public final class TransactionAwareAttachmentStorage implements AttachmentStorage {
    private static final Logger logger = LoggerFactory.getLogger(TransactionAwareAttachmentStorage.class);

    private final AttachmentStorage delegate;

    public TransactionAwareAttachmentStorage(AttachmentStorage delegate) {
        this.delegate = delegate;
    }

    @Override
    public StoredObject put(String objectKey, InputStream content, long contentLength, String contentType) {
        StoredObject storedObject = delegate.put(objectKey, content, contentLength, contentType);
        if (transactionSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        deleteQuietly(storedObject.objectKey(), "rolled-back attachment upload");
                    }
                }
            });
        }
        return storedObject;
    }

    @Override
    public InputStream get(String objectKey) {
        return delegate.get(objectKey);
    }

    @Override
    public void delete(String objectKey) {
        if (!transactionSynchronizationActive()) {
            delegate.delete(objectKey);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(objectKey, "committed attachment deletion");
            }
        });
    }

    private static boolean transactionSynchronizationActive() {
        return TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive();
    }

    private void deleteQuietly(String objectKey, String operation) {
        try {
            delegate.delete(objectKey);
        } catch (RuntimeException ex) {
            logger.error("Failed to clean up object '{}' after {}. The object must be reconciled.", objectKey, operation, ex);
        }
    }
}
