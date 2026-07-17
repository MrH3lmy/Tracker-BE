package com.taskpriority.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "email is required")
        String email,

        @NotBlank(message = "password is required")
        String password,

        @Size(max = 255, message = "deviceLabel must be at most 255 characters")
        String deviceLabel
) {}
