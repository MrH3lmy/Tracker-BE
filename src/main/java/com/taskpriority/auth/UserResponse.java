package com.taskpriority.auth;

import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.model.User;

public record UserResponse(Long id, String email, String displayName, Tier tier, Role role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getTier(), user.getRole());
    }
}
