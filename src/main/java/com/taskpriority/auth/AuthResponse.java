package com.taskpriority.auth;

public record AuthResponse(String accessToken, String refreshToken, UserResponse user) {
}
