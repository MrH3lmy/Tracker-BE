package com.taskpriority.notes.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Proves {@link AttachmentStorageConfig#s3Client} keeps the AWS SDK's normal (retrying)
 * configuration rather than disabling retries client-wide. A previous version of this fix disabled
 * retries entirely on the S3 client to work around {@code put()} handing the SDK a one-shot upload
 * stream; that traded away transient-failure retries for every other operation on the same client
 * (getObject, deleteObject, headBucket, bucket bootstrap). The upload-stream problem is now fixed
 * where it actually lives - see {@link S3AttachmentStorage#put} spooling to a replayable
 * file-backed {@code RequestBody} instead - so the client itself has no reason to disable retries.
 *
 * <p>This runs a bare local TCP server that returns one retryable HTTP 500 (S3 "InternalError")
 * followed by a 200 OK on a second connection, and asserts a plain {@code headBucket} call against
 * it succeeds - which is only possible if the SDK actually retried after the first failure.</p>
 */
class AttachmentStorageConfigRetryTest {

    @Test
    @Timeout(30)
    void s3ClientRetriesATransientFiveHundredResponseInsteadOfFailingImmediately() throws Exception {
        try (ServerSocket serverSocket = new ServerSocket(0)) {
            int port = serverSocket.getLocalPort();
            CountDownLatch serverDone = new CountDownLatch(1);
            Thread server = new Thread(() -> runFlakyThenHealthyServer(serverSocket, serverDone));
            server.setDaemon(true);
            server.start();

            AttachmentStorageProperties properties = new AttachmentStorageProperties();
            properties.setRegion("us-east-1");
            properties.setEndpoint("http://localhost:" + port);
            properties.setBucket("test-bucket");
            properties.setPathStyleAccess(true);
            properties.setAccessKey("test-access-key");
            properties.setSecretKey("test-secret-key");

            S3Client s3Client = new AttachmentStorageConfig().s3Client(properties);
            try {
                assertThatCode(() -> s3Client.headBucket(HeadBucketRequest.builder().bucket("test-bucket").build()))
                        .doesNotThrowAnyException();
            } finally {
                s3Client.close();
            }

            assertThatCode(() -> {
                if (!serverDone.await(10, TimeUnit.SECONDS)) {
                    throw new AssertionError("Test server never served its second (successful) response");
                }
            }).doesNotThrowAnyException();
        }
    }

    private static void runFlakyThenHealthyServer(ServerSocket serverSocket, CountDownLatch serverDone) {
        try {
            handleOneRequest(serverSocket, retryableErrorResponse());
            handleOneRequest(serverSocket, successResponse());
            serverDone.countDown();
        } catch (IOException ex) {
            throw new UncheckedIOExceptionForTest(ex);
        }
    }

    private static void handleOneRequest(ServerSocket serverSocket, String response) throws IOException {
        try (Socket socket = serverSocket.accept()) {
            consumeRequestHeaders(socket);
            try (OutputStream out = socket.getOutputStream()) {
                out.write(response.getBytes(StandardCharsets.US_ASCII));
                out.flush();
            }
        }
    }

    private static void consumeRequestHeaders(Socket socket) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
        String line;
        while ((line = reader.readLine()) != null && !line.isEmpty()) {
            // Draining the request line + headers is enough for a HEAD request (no body) - the
            // server only needs to know the client is done sending before it writes a response.
        }
    }

    private static String retryableErrorResponse() {
        String body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Error><Code>InternalError</Code>"
                + "<Message>simulated transient failure</Message><RequestId>test-request-id</RequestId></Error>";
        return "HTTP/1.1 500 Internal Server Error\r\n"
                + "Content-Type: application/xml\r\n"
                + "Content-Length: " + body.length() + "\r\n"
                + "Connection: close\r\n\r\n"
                + body;
    }

    private static String successResponse() {
        return "HTTP/1.1 200 OK\r\n"
                + "Content-Length: 0\r\n"
                + "Connection: close\r\n\r\n";
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(IOException cause) {
            super(cause);
        }
    }
}
