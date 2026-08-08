package com.taskpriority.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Native clients have no ambient cookie, so the refresh token they were issued at
 * login/register/last-refresh travels explicitly in the body instead.
 */
public record NativeRefreshRequest(
        @NotBlank(message = "refreshToken is required")
        String refreshToken
) {}
