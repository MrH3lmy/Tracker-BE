package com.taskpriority.notes.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TransactionAwareAttachmentStorageTest {

    private AttachmentStorage delegate;
    private TransactionAwareAttachmentStorage storage;

    @BeforeEach
    void setUp() {
        delegate = mock(AttachmentStorage.class);
        storage = new TransactionAwareAttachmentStorage(delegate);
        TransactionSynchronizationManager.setActualTransactionActive(true);
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test
    void rolledBackUploadDeletesTheNewObject() {
        StoredObject storedObject = new StoredObject("users/1/notes/2/attachments/3/object", 3, "checksum");
        when(delegate.put(storedObject.objectKey(), new ByteArrayInputStream(new byte[]{1, 2, 3}), 3, "image/png"))
                .thenReturn(storedObject);

        ByteArrayInputStream content = new ByteArrayInputStream(new byte[]{1, 2, 3});
        when(delegate.put(storedObject.objectKey(), content, 3, "image/png")).thenReturn(storedObject);

        assertThat(storage.put(storedObject.objectKey(), content, 3, "image/png")).isEqualTo(storedObject);
        verify(delegate, never()).delete(storedObject.objectKey());

        synchronization().afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(delegate).delete(storedObject.objectKey());
    }

    @Test
    void committedUploadKeepsTheObject() {
        StoredObject storedObject = new StoredObject("object", 1, "checksum");
        ByteArrayInputStream content = new ByteArrayInputStream(new byte[]{1});
        when(delegate.put("object", content, 1, "image/png")).thenReturn(storedObject);

        storage.put("object", content, 1, "image/png");
        synchronization().afterCompletion(TransactionSynchronization.STATUS_COMMITTED);

        verify(delegate, never()).delete("object");
    }

    @Test
    void objectDeleteRunsOnlyAfterDatabaseCommit() {
        storage.delete("object");

        verify(delegate, never()).delete("object");
        synchronization().afterCommit();

        verify(delegate).delete("object");
    }

    @Test
    void rolledBackDatabaseDeleteKeepsTheObject() {
        storage.delete("object");

        synchronization().afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(delegate, never()).delete("object");
    }

    private static TransactionSynchronization synchronization() {
        assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);
        return TransactionSynchronizationManager.getSynchronizations().getFirst();
    }
}
