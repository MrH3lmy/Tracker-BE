package com.taskpriority.admin;

import com.taskpriority.auth.UserResponse;
import com.taskpriority.common.exception.ApiErrorResponse;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.entitlement.EntitlementService;
import com.taskpriority.model.User;
import com.taskpriority.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin-only user management. Requires the ADMIN role.")
public class AdminUserController {
    private final UserRepository userRepository;
    private final EntitlementService entitlementService;

    public AdminUserController(UserRepository userRepository, EntitlementService entitlementService) {
        this.userRepository = userRepository;
        this.entitlementService = entitlementService;
    }

    @Operation(summary = "Change a user's subscription tier", description = "Admin-only. Immediately re-enforces the session cap for the user in case this was a downgrade.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tier updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Caller does not have the ADMIN role", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "User not found", content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    @PutMapping("/{userId}/tier")
    public UserResponse updateTier(@PathVariable Long userId, @Valid @RequestBody UpdateUserTierRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + userId + " not found"));
        user.setTier(request.tier());
        user = userRepository.save(user);
        // Immediately re-enforce the session cap in case this was a downgrade - a FREE user
        // shouldn't keep sessions that were only valid because they were PREMIUM a moment ago.
        entitlementService.enforceSessionCap(user.getId(), user.getTier());
        return UserResponse.from(user);
    }
}
