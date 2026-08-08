package com.taskpriority.reminder;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.UUID;

/**
 * A stable identifier for this application instance's lifetime, used to attribute claimed outbox
 * entries (see {@code notification_outbox.worker_id}) and dispatcher metrics to a specific worker
 * in a horizontally-scaled deployment (issue #255). Hostname-based rather than a bare random UUID
 * so it remains recognizable in logs, with a random suffix to distinguish multiple processes on
 * the same host. The hostname is bounded so the complete identifier always fits the database
 * column even when infrastructure supplies an unusually long FQDN.
 */
@Component
public class WorkerIdentity {
    private static final int MAX_WORKER_ID_LENGTH = 100;
    private static final int SUFFIX_LENGTH = 9; // ':' plus eight hex characters

    private final String workerId;

    public WorkerIdentity() {
        String suffix = ":" + UUID.randomUUID().toString().substring(0, 8);
        String hostname = resolveHostname();
        int maxHostnameLength = MAX_WORKER_ID_LENGTH - SUFFIX_LENGTH;
        if (hostname.length() > maxHostnameLength) {
            hostname = hostname.substring(0, maxHostnameLength);
        }
        this.workerId = hostname + suffix;
    }

    public String getWorkerId() {
        return workerId;
    }

    private static String resolveHostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException ex) {
            return "unknown-host";
        }
    }
}
