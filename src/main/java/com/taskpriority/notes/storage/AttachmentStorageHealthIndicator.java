package com.taskpriority.notes.storage;

import org.springframework.boot.actuate.autoconfigure.health.ConditionalOnEnabledHealthIndicator;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

/**
 * Reports object-storage reachability separately from application liveness/readiness (issue: the
 * "Docker/startup storage resilience" fix) - a MinIO/S3 outage is a real, observable degradation
 * of attachment upload/download, but it must never flip the app itself to DOWN: unrelated features
 * (auth, tasks, planning, notes without attachments, etc.) keep working with storage down, and the
 * Docker HEALTHCHECK / liveness / readiness probes must reflect that rather than restart-looping a
 * perfectly healthy application process. Disabled by default for exactly that reason - same
 * precedent as {@code management.health.redis.enabled=false} in application.properties - so this
 * indicator never contributes to the aggregate {@code /actuator/health} status unless an operator
 * deliberately opts in with {@code management.health.attachmentStorage.enabled=true} (e.g. to
 * expose it as a distinct, non-blocking data point via a dedicated health group).
 */
@Configuration
public class AttachmentStorageHealthIndicator {

    @Bean
    @ConditionalOnProperty(prefix = "app.storage.s3", name = "enabled", havingValue = "true")
    @ConditionalOnEnabledHealthIndicator("attachmentStorage")
    public HealthIndicator attachmentStorageHealthIndicator(S3Client s3Client, AttachmentStorageProperties properties) {
        String bucket = properties.getBucket();
        return () -> {
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
                return Health.up().withDetail("bucket", bucket).build();
            } catch (SdkException ex) {
                return Health.down().withDetail("bucket", bucket).withDetail("error", ex.getMessage()).build();
            }
        };
    }
}
