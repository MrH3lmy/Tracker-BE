package com.taskpriority.reminder;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.UUID;

/**
 * A stable identifier for this application instance's lifetime, used to attribute claimed outbox
 * entries (see {@code notification_outbox.worker_id}) and dispatcher metrics to a specific worker
 * in a horizontally-scaled deployment (issue #255) - without this, a stuck/recovered entry or a
 * duplicate-processing incident could only be traced back to "some instance, at some point," not
 * which one. Hostname-based rather than a bare random UUID so it reads as something recognizable
 * in logs/dashboards (e.g. matching a Kubernetes pod name); the random suffix still guarantees
 * uniqueness when two instances happen to share a hostname (e.g. local Docker Compose containers
 * using their container ID, or a host running multiple instances).
 */
@Component
public class WorkerIdentity {
    private final String workerId;

    public WorkerIdentity() {
        this.workerId = resolveHostname() + ":" + UUID.randomUUID().toString().substring(0, 8);
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
