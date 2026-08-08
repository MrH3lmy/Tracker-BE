package com.taskpriority.auth;

/**
 * Carries the raw refresh token internally between {@link AuthService} and its callers.
 * {@link AuthController} (browser) strips it before responding - see {@link AuthResponseBody} -
 * since that contract delivers the refresh token only via an {@code HttpOnly} cookie.
 * {@link NativeAuthController} returns this record directly as the JSON body: the native contract
 * *is* to deliver the refresh token in the body, for the client to persist in OS-backed secure
 * storage.
 */
public record AuthResponse(String accessToken, String refreshToken, UserResponse user) {
}
