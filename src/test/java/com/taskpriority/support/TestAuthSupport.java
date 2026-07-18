package com.taskpriority.support;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.model.User;
import com.taskpriority.repository.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.TestSecurityContextHolder;

import java.util.List;

/**
 * Shared helper for full @SpringBootTest MockMvc tests that exercise real (non-mocked) service
 * code, which now resolves the current user via CurrentUserService/SecurityContextHolder.
 * Persists a real User row (tasks/notes/etc. have a NOT NULL FK to users) and pre-populates
 * TestSecurityContextHolder so every mockMvc.perform() call in the test is authenticated as that
 * user, without needing to touch each individual request builder.
 */
public final class TestAuthSupport {
    private TestAuthSupport() {}

    public static User loginAsNewUser(UserRepository userRepository) {
        User user = new User();
        user.setEmail("test-user-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant-for-these-tests");
        user.setTier(Tier.PREMIUM);
        user.setRole(Role.USER);
        user = userRepository.save(user);

        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getTier(), user.getRole());
        TestSecurityContextHolder.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
        return user;
    }
}
