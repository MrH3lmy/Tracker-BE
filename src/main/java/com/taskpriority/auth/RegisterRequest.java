package com.taskpriority.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid email address")
        String email,

        @NotBlank(message = "password is required")
        @Size(min = 8, message = "password must be at least 8 characters")
        String password,

        @Size(max = 120, message = "displayName must be at most 120 characters")
        String displayName,

        @Size(max = 255, message = "deviceLabel must be at most 255 characters")
        String deviceLabel
) {}
