package com.taskpriority.model;

/**
 * The channel a {@link UserSession} was issued through. Set explicitly by the endpoint the client
 * called (browser cookie flow vs. a dedicated {@code /api/v1/auth/native/*} route) - never
 * inferred from a spoofable header like {@code User-Agent} - and carried forward unchanged across
 * refresh rotations. Purely descriptive device metadata; it has no bearing on how a session is
 * authenticated or revoked.
 */
public enum Platform {
    WEB,
    ANDROID,
    IOS,
    WINDOWS,
    MACOS,
    LINUX
}
