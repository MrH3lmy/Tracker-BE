package com.taskpriority.auth;

import com.taskpriority.model.Platform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Same shape as {@link LoginRequest} plus the explicit, client-declared {@link Platform} - see
 * {@link NativeRegisterRequest} for why this is required rather than inferred.
 */
public record NativeLoginRequest(
        @NotBlank(message = "email is required")
        String email,

        @NotBlank(message = "password is required")
        String password,

        @Size(max = 255, message = "deviceLabel must be at most 255 characters")
        String deviceLabel,

        @NotNull(message = "platform is required")
        Platform platform
) {
    LoginRequest toLoginRequest() {
        return new LoginRequest(email, password, deviceLabel);
    }
}
