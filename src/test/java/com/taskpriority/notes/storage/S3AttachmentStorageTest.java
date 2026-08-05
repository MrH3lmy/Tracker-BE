package com.taskpriority.notes.storage;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

    private static String expectedSha256Hex(byte[] content) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    }
}
