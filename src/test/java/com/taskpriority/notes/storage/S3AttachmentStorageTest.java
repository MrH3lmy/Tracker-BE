package com.taskpriority.notes.storage;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3AttachmentStorageTest {

    private final S3Client s3Client = mock(S3Client.class);
    private final S3AttachmentStorage storage = new S3AttachmentStorage(s3Client, "test-bucket");

    @Test
    void putUploadsWithTheGivenBucketKeyAndContentTypeAndReturnsAVerifiableChecksum() throws Exception {
        byte[] content = "hello attachment bytes".getBytes();
        // A real S3Client fully reads the RequestBody's stream to transmit it as the HTTP request
        // body - which is what actually drives bytes through S3AttachmentStorage's wrapping
        // DigestInputStream before it reads the digest back out below. Simulate that draining here
        // since a mocked putObject() otherwise never touches the stream at all.
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class))).thenAnswer(invocation -> {
            RequestBody body = invocation.getArgument(1);
            try (InputStream drain = body.contentStreamProvider().newStream()) {
                drain.readAllBytes();
            }
            return PutObjectResponse.builder().build();
        });

        StoredObject result = storage.put("users/1/notes/2/attachments/3/key", new ByteArrayInputStream(content), content.length, "image/png");

        assertEquals("users/1/notes/2/attachments/3/key", result.objectKey());
        assertEquals(content.length, result.sizeBytes());
        assertEquals(expectedSha256Hex(content), result.checksumSha256());

        verify(s3Client).putObject(eq(PutObjectRequest.builder()
                .bucket("test-bucket").key("users/1/notes/2/attachments/3/key")
                .contentType("image/png").contentLength((long) content.length).build()), any(RequestBody.class));
    }

    @Test
    void getFetchesFromTheConfiguredBucketByKey() {
        ResponseInputStream<GetObjectResponse> response = new ResponseInputStream<>(
                GetObjectResponse.builder().build(), new ByteArrayInputStream("bytes".getBytes()));
        when(s3Client.getObject(GetObjectRequest.builder().bucket("test-bucket").key("some-key").build())).thenReturn(response);

        InputStream result = storage.get("some-key");

        assertEquals(response, result);
    }

    @Test
    void deleteRemovesFromTheConfiguredBucketByKey() {
        storage.delete("some-key");

        verify(s3Client).deleteObject(DeleteObjectRequest.builder().bucket("test-bucket").key("some-key").build());
    }

    @Test
    void ensureBucketExistsSwallowsAnS3ExceptionLikeBucketAlreadyOwnedByYou() {
        when(s3Client.createBucket(any(CreateBucketRequest.class)))
                .thenThrow(S3Exception.builder().message("BucketAlreadyOwnedByYou").statusCode(409).build());

        assertThatCode(storage::ensureBucketExists).doesNotThrowAnyException();
    }

    @Test
    void ensureBucketExistsSwallowsAnSdkClientExceptionFromAnUnresolvableOrUnreachableEndpoint() {
        // Reproduces the reported Docker/startup failure: MinIO's hostname doesn't resolve (or the
        // endpoint is otherwise unreachable), which the AWS SDK surfaces as SdkClientException, not
        // the narrower S3Exception subtype - this must be exactly as non-fatal so the bean creating
        // this instance (see AttachmentStorageConfig#attachmentStorage) never fails Spring context
        // startup over object storage being temporarily unavailable.
        when(s3Client.createBucket(any(CreateBucketRequest.class)))
                .thenThrow(SdkClientException.create("Received an UnknownHostException when attempting to interact with a service"));

        assertThatCode(storage::ensureBucketExists).doesNotThrowAnyException();
    }

    @Test
    void putWrapsASdkClientExceptionFromAnUnreachableEndpointInAttachmentStorageException() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(SdkClientException.create("Unable to execute HTTP request: minio"));

        assertThatThrownBy(() -> storage.put("some-key", new ByteArrayInputStream(new byte[]{1}), 1, "image/png"))
                .isInstanceOf(AttachmentStorageException.class)
                .hasCauseInstanceOf(SdkClientException.class);
    }

    @Test
    void getWrapsASdkClientExceptionFromAnUnreachableEndpointInAttachmentStorageException() {
        when(s3Client.getObject(any(GetObjectRequest.class)))
                .thenThrow(SdkClientException.create("Unable to execute HTTP request: minio"));

        assertThatThrownBy(() -> storage.get("some-key"))
                .isInstanceOf(AttachmentStorageException.class)
                .hasCauseInstanceOf(SdkClientException.class);
    }

    @Test
    void deleteWrapsASdkClientExceptionFromAnUnreachableEndpointInAttachmentStorageException() {
        doThrow(SdkClientException.create("Unable to execute HTTP request: minio"))
                .when(s3Client).deleteObject(any(DeleteObjectRequest.class));

        assertThatThrownBy(() -> storage.delete("some-key"))
                .isInstanceOf(AttachmentStorageException.class)
                .hasCauseInstanceOf(SdkClientException.class);
    }

    private static String expectedSha256Hex(byte[] content) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    }
}
