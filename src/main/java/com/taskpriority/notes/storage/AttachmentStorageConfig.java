package com.taskpriority.notes.storage;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

import java.net.URI;

/**
 * Wires the S3-compatible attachment storage beans only when {@code app.storage.s3.enabled=true}
 * - see {@link AttachmentStorageProperties} for why that defaults to off. Endpoint override +
 * path-style access make this work against MinIO/LocalStack for local dev as well as real S3.
 */
@Configuration
@EnableConfigurationProperties(AttachmentStorageProperties.class)
public class AttachmentStorageConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.storage.s3", name = "enabled", havingValue = "true")
    public S3Client s3Client(AttachmentStorageProperties properties) {
        // Deliberately left at the SDK's default retry strategy - getObject/deleteObject/
        // headBucket/createBucket all benefit from the SDK's normal transient-failure retries, and
        // there is no reason to weaken that for the whole client. put()'s own one-shot upload
        // stream used to make retries actively harmful (see S3AttachmentStorage#put), but that's
        // now fixed by spooling the upload to a replayable file-backed RequestBody instead -
        // solving it there, not by disabling retries here.
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(credentialsProvider(properties))
                .forcePathStyle(properties.isPathStyleAccess());
        if (properties.getEndpoint() != null && !properties.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(properties.getEndpoint()));
        }
        return builder.build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.storage.s3", name = "enabled", havingValue = "true")
    public AttachmentStorage attachmentStorage(S3Client s3Client, AttachmentStorageProperties properties) {
        S3AttachmentStorage s3Storage = new S3AttachmentStorage(s3Client, properties.getBucket());
        // The S3 implementation is wrapped rather than registered as the returned bean, so Spring
        // cannot invoke its @PostConstruct callback automatically. Initialize it explicitly before
        // exposing the transaction-aware decorator; this keeps Docker Compose/MinIO first-run
        // behavior identical to the unwrapped implementation. ensureBucketExists() swallows every
        // SdkException (bucket-already-exists/access-denied *and* DNS/connect/timeout failures
        // alike - see its javadoc), so a temporarily unreachable object store can never fail this
        // bean, and therefore can never fail Spring context startup for the whole application.
        s3Storage.ensureBucketExists();
        return new TransactionAwareAttachmentStorage(s3Storage);
    }

    private static AwsCredentialsProvider credentialsProvider(AttachmentStorageProperties properties) {
        if (properties.getAccessKey() != null && !properties.getAccessKey().isBlank()) {
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey()));
        }
        // Falls through to the SDK's normal credential chain (env vars, instance/task role,
        // ~/.aws/credentials, etc.) for deployments that intentionally don't set a static key pair.
        return DefaultCredentialsProvider.create();
    }
}
