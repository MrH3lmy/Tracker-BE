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
        return new S3AttachmentStorage(s3Client, properties.getBucket());
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
