package com.taskpriority.auth;

import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;

public record AuthenticatedUser(Long userId, String email, Tier tier, Role role) {
}
