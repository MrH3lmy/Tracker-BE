package com.taskpriority.notes.storage;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public class S3AttachmentStorage implements AttachmentStorage {
    private static final Logger logger = LoggerFactory.getLogger(S3AttachmentStorage.class);

    private final S3Client s3Client;
    private final String bucket;

    public S3AttachmentStorage(S3Client s3Client, String bucket) {
        this.s3Client = s3Client;
        this.bucket = bucket;
    }

    /**
     * Local-dev/self-hosted-MinIO convenience only - real deployments provision the bucket out of
     * band (Terraform/CloudFormation/etc.) and typically shouldn't grant the app CreateBucket
     * permission at all, so a failure here is logged and swallowed rather than crashing startup;
     * a genuinely missing bucket still surfaces loudly on the first real put/get/delete call.
     * {@code @PostConstruct} rather than doing this in the constructor itself - SpotBugs flags a
     * constructor that can throw (CT_CONSTRUCTOR_THROW) since it leaves a partially-constructed
     * object reachable if the call fails in a way this method's own catch doesn't cover.
     */
    @PostConstruct
    void ensureBucketExists() {
        try {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception ex) {
            logger.debug("Skipping attachment bucket auto-create for '{}' ({}) - assuming it already exists or is provisioned externally.", bucket, ex.awsErrorDetails() != null ? ex.awsErrorDetails().errorCode() : ex.getMessage());
        }
    }

    @Override
    public StoredObject put(String objectKey, InputStream content, long contentLength, String contentType) {
        MessageDigest sha256 = sha256Digest();
        try (DigestInputStream digestStream = new DigestInputStream(content, sha256)) {
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(objectKey).contentType(contentType).contentLength(contentLength).build(),
                    RequestBody.fromInputStream(digestStream, contentLength));
            return new StoredObject(objectKey, contentLength, HexFormat.of().formatHex(sha256.digest()));
        } catch (java.io.IOException ex) {
            throw new AttachmentStorageException("Failed to read attachment content while uploading '" + objectKey + "'", ex);
        }
    }

    @Override
    public InputStream get(String objectKey) {
        return s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(objectKey).build());
    }

    @Override
    public void delete(String objectKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
