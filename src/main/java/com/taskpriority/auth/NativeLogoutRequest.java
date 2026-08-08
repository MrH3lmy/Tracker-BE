package com.taskpriority.auth;

/**
 * {@code refreshToken} is deliberately not {@code @NotBlank}: like the browser cookie flow,
 * logout is best-effort - a missing/blank token is a no-op 204, not a validation error, since the
 * client's goal (be signed out) is already satisfied if it never had a token to revoke.
 */
public record NativeLogoutRequest(String refreshToken) {}
