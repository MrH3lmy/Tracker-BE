package com.taskpriority.notes.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3-compatible object storage config for note attachments (issue #261). Disabled by default -
 * {@code enabled=false} keeps every existing environment (including every test profile) on the
 * legacy PostgreSQL-bytea attachment path with zero behavior change; set
 * {@code app.storage.s3.enabled=true} (see docker-compose.yml's minio service for a local
 * example) to switch new uploads to object storage.
 */
@ConfigurationProperties(prefix = "app.storage.s3")
public class AttachmentStorageProperties {
    private boolean enabled = false;
    private String endpoint;
    private String region = "us-east-1";
    private String bucket = "tracker-attachments";
    private String accessKey;
    private String secretKey;
    private boolean pathStyleAccess = true;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }
    public String getAccessKey() { return accessKey; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    public boolean isPathStyleAccess() { return pathStyleAccess; }
    public void setPathStyleAccess(boolean pathStyleAccess) { this.pathStyleAccess = pathStyleAccess; }
}
