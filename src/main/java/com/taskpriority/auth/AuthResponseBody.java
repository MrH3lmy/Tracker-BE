package com.taskpriority.auth;

/**
 * The JSON body {@link AuthController} (browser) returns from register/login/refresh -
 * deliberately excludes the raw refresh token, which travels only via the HttpOnly
 * {@code refreshToken} cookie for that contract. {@link NativeAuthController} returns
 * {@link AuthResponse} directly instead, since the native contract's whole point is delivering
 * the refresh token in the body.
 */
public record AuthResponseBody(String accessToken, UserResponse user) {
    static AuthResponseBody from(AuthResponse response) {
        return new AuthResponseBody(response.accessToken(), response.user());
    }
}
