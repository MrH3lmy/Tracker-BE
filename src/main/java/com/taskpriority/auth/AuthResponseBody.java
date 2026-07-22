package com.taskpriority.auth;

/**
 * The JSON body actually returned to clients from register/login/refresh - deliberately excludes
 * the raw refresh token, which travels only via the HttpOnly {@code refreshToken} cookie (see
 * AuthController). {@link AuthResponse} (with the raw token) stays internal to the service layer.
 */
public record AuthResponseBody(String accessToken, UserResponse user) {
    static AuthResponseBody from(AuthResponse response) {
        return new AuthResponseBody(response.accessToken(), response.user());
    }
}
