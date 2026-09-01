package com.taskpriority.notes.storage;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves the fix for the reported Docker/startup failure: MinIO/S3 being unresolvable or
 * unreachable at boot must not fail Spring context creation. Before the fix,
 * {@code AttachmentStorageConfig#attachmentStorage} called {@code S3AttachmentStorage#ensureBucketExists}
 * during bean construction, and that method only caught the narrower {@link
 * software.amazon.awssdk.services.s3.model.S3Exception} - a DNS failure resolving the configured
 * endpoint surfaces as the sibling {@link software.amazon.awssdk.core.exception.SdkClientException}
 * instead, which escaped uncaught and failed the whole application context (and therefore every
 * unrelated feature - auth, tasks, notes without attachments, etc.) over one optional dependency.
 *
 * <p>{@code app.storage.s3.endpoint} below points at a {@code .invalid} hostname - reserved by
 * RFC 2606 to always fail DNS resolution - so this test exercises a real {@code UnknownHostException}
 * without depending on any actual network service being up or down.</p>
 */
class AttachmentStorageStartupResilienceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(AttachmentStorageConfig.class)
            .withPropertyValues(
                    "app.storage.s3.enabled=true",
                    "app.storage.s3.endpoint=http://attachment-storage-test-host.invalid:9000",
                    "app.storage.s3.bucket=test-bucket",
                    "app.storage.s3.access-key=test-access-key",
                    "app.storage.s3.secret-key=test-secret-key");

    @Test
    void springContextStartsSuccessfullyWhenObjectStorageEndpointIsUnresolvable() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(AttachmentStorage.class);
        });
    }

    @Test
    void realOperationsAgainstTheSameUnreachableEndpointStillFailExplicitlyRatherThanSilently() {
        contextRunner.run(context -> {
            AttachmentStorage storage = context.getBean(AttachmentStorage.class);

            // Bucket auto-create failed silently at startup (see above), but that must never be
            // mistaken for "storage is fine" - a real put/get/delete against the same unreachable
            // endpoint has to fail loudly with the app's own domain exception, not hang, not throw
            // some unrelated/confusing exception, and never silently report success.
            assertThatThrownBy(() -> storage.put("some-key", new ByteArrayInputStream(new byte[]{1}), 1, "image/png"))
                    .isInstanceOf(AttachmentStorageException.class);
        });
    }
}
