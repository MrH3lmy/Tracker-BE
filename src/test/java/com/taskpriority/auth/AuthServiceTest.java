package com.taskpriority.auth;

import com.taskpriority.entitlement.EntitlementService;
import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.model.User;
import com.taskpriority.model.UserSession;
import com.taskpriority.notes.NoteTemplateService;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    private UserRepository userRepository;
    private UserSessionRepository userSessionRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private EntitlementService entitlementService;
    private NoteTemplateService noteTemplateService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userSessionRepository = mock(UserSessionRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = mock(JwtService.class);
        entitlementService = mock(EntitlementService.class);
        noteTemplateService = mock(NoteTemplateService.class);
        authService = new AuthService(userRepository, userSessionRepository, passwordEncoder, jwtService, entitlementService, noteTemplateService, 30);

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            if (user.getId() == null) user.setId(1L);
            return user;
        });
        when(jwtService.issueAccessToken(any(), anyString(), any(), any())).thenReturn("fake-access-token");
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest("taken@example.com", "password123", "Name", null);
        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
    }

    @Test
    void registerHashesPasswordAndIssuesSession() {
        when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);

        RegisterRequest request = new RegisterRequest("new@example.com", "password123", "New User", "test-device");
        AuthResponse response = authService.register(request);

        assertEquals("fake-access-token", response.accessToken());
        assertEquals(Tier.FREE, response.user().tier());
        assertEquals(Role.USER, response.user().role());
        verify(userSessionRepository).save(any(UserSession.class));
        verify(entitlementService).enforceSessionCap(any(), any());
    }

    @Test
    void loginRejectsWrongPassword() {
        User user = existingUser("user@example.com", "correct-password");
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest("user@example.com", "wrong-password", null);
        assertThrows(IllegalArgumentException.class, () -> authService.login(request));
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        User user = existingUser("user@example.com", "correct-password");
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "correct-password", null));

        assertEquals("user@example.com", response.user().email());
        verify(entitlementService).enforceSessionCap(user.getId(), user.getTier());
    }

    @Test
    void refreshRotatesTokenAndRevokesOldSession() {
        User user = existingUser("user@example.com", "correct-password");
        user.setId(7L);
        UserSession session = new UserSession();
        session.setId(99L);
        session.setUserId(7L);
        session.setExpiresAt(LocalDateTime.now().plusDays(1));
        session.setRevoked(false);

        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        AuthResponse response = authService.refresh(new RefreshRequest("some-refresh-token"));

        assertNotEquals("some-refresh-token", response.refreshToken());
        assertEquals(true, session.isRevoked());
    }

    @Test
    void refreshRejectsExpiredSession() {
        UserSession session = new UserSession();
        session.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));

        assertThrows(IllegalArgumentException.class, () -> authService.refresh(new RefreshRequest("expired-token")));
    }

    private User existingUser(String email, String rawPassword) {
        User user = new User();
        user.setId(1L);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setTier(Tier.FREE);
        user.setRole(Role.USER);
        return user;
    }
}
