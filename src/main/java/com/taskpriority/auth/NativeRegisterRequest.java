package com.taskpriority.auth;

import com.taskpriority.model.Platform;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Same shape as {@link RegisterRequest} plus the explicit, client-declared {@link Platform} this
 * app is running on - required so sessions issued through this route always carry real device
 * metadata (see {@code UserSession#platform}), never a guess from a spoofable header.
 */
public record NativeRegisterRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid email address")
        String email,

        @NotBlank(message = "password is required")
        @Size(min = 8, message = "password must be at least 8 characters")
        String password,

        @Size(max = 120, message = "displayName must be at most 120 characters")
        String displayName,

        @Size(max = 255, message = "deviceLabel must be at most 255 characters")
        String deviceLabel,

        @NotNull(message = "platform is required")
        Platform platform
) {
    @AssertTrue(message = "platform must be a native platform")
    public boolean isNativePlatform() {
        return platform == null || platform.isNative();
    }

    RegisterRequest toRegisterRequest() {
        return new RegisterRequest(email, password, displayName, deviceLabel);
    }
}
