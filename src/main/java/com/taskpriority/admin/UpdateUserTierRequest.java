package com.taskpriority.admin;

import com.taskpriority.model.Tier;
import jakarta.validation.constraints.NotNull;

public record UpdateUserTierRequest(
        @NotNull(message = "tier is required")
        Tier tier
) {}
