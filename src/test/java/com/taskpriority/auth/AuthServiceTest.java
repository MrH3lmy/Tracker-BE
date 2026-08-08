package com.taskpriority.auth;

import com.taskpriority.board.BoardProvisioningService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.entitlement.EntitlementService;
import com.taskpriority.model.Platform;
import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.model.User;
import com.taskpriority.model.UserSession;
import com.taskpriority.notes.NoteTemplateService;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
    private BoardProvisioningService boardProvisioningService;
    private SessionRevocationService sessionRevocationService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userSessionRepository = mock(UserSessionRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = mock(JwtService.class);
        entitlementService = mock(EntitlementService.class);
        noteTemplateService = mock(NoteTemplateService.class);
        boardProvisioningService = mock(BoardProvisioningService.class);
        sessionRevocationService = mock(SessionRevocationService.class);
        authService = new AuthService(userRepository, userSessionRepository, passwordEncoder, jwtService, entitlementService, noteTemplateService, boardProvisioningService, sessionRevocationService, 30);

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
        verify(boardProvisioningService).provisionDefaultBoardForUser(any());
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
        when(userSessionRepository.consumeByTokenHash(anyString(), any())).thenReturn(1);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        AuthResponse response = authService.refresh("some-refresh-token");

        assertNotEquals("some-refresh-token", response.refreshToken());
        verify(userSessionRepository).consumeByTokenHash(anyString(), any());
    }

    @Test
    void refreshRejectsExpiredSession() {
        UserSession session = new UserSession();
        session.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        // consumeByTokenHash's WHERE clause excludes expired rows, so the conditional UPDATE
        // affects 0 rows here - same as an unknown/revoked token, and unstubbed mocks already
        // default int-returning methods to 0, but stub it explicitly for clarity.
        when(userSessionRepository.consumeByTokenHash(anyString(), any())).thenReturn(0);

        assertThrows(IllegalArgumentException.class, () -> authService.refresh("expired-token"));
    }

    @Test
    void refreshRejectsAlreadyConsumedTokenEvenWhenTheCachedEntityLooksValid() {
        // Simulates the race this fix closes: a second concurrent request reads the session
        // before the first request's UPDATE commits, so the plain SELECT still shows
        // revoked=false, but the atomic conditional UPDATE (which is what actually matters)
        // affects 0 rows because the first request already consumed it.
        User user = existingUser("user@example.com", "correct-password");
        user.setId(7L);
        UserSession session = new UserSession();
        session.setId(99L);
        session.setUserId(7L);
        session.setExpiresAt(LocalDateTime.now().plusDays(1));
        session.setRevoked(false);

        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(userSessionRepository.consumeByTokenHash(anyString(), any())).thenReturn(0);

        assertThrows(IllegalArgumentException.class, () -> authService.refresh("already-used-token"));
        verify(userRepository, org.mockito.Mockito.never()).findById(any());
    }

    @Test
    void refreshOfAnAlreadyConsumedTokenRevokesTheWholeFamily() {
        // Distinct from the concurrent-race test above: here the session was ALREADY revoked at
        // read time (not flipped mid-flight by a concurrent winner), so this is a token being
        // replayed well after its legitimate rotation already completed - the strong signal of
        // theft that should nuke every session descended from the same login, not just reject
        // this one request.
        java.util.UUID familyId = java.util.UUID.randomUUID();
        UserSession session = new UserSession();
        session.setId(99L);
        session.setUserId(7L);
        session.setFamilyId(familyId);
        session.setExpiresAt(LocalDateTime.now().plusDays(1));
        session.setRevoked(true);

        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(userSessionRepository.consumeByTokenHash(anyString(), any())).thenReturn(0);

        assertThrows(IllegalArgumentException.class, () -> authService.refresh("stolen-already-used-token"));
        verify(sessionRevocationService).revokeFamily(familyId);
    }

    @Test
    void refreshRejectsAlreadyConsumedTokenEvenWhenTheCachedEntityLooksValidWithoutRevokingFamily() {
        UserSession session = new UserSession();
        session.setId(99L);
        session.setUserId(7L);
        session.setFamilyId(java.util.UUID.randomUUID());
        session.setExpiresAt(LocalDateTime.now().plusDays(1));
        session.setRevoked(false);

        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(userSessionRepository.consumeByTokenHash(anyString(), any())).thenReturn(0);

        assertThrows(IllegalArgumentException.class, () -> authService.refresh("racing-token"));
        verify(sessionRevocationService, org.mockito.Mockito.never()).revokeFamily(any());
    }

    @Test
    void registerWithoutAnExplicitPlatformDefaultsToWeb() {
        when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
        RegisterRequest request = new RegisterRequest("new@example.com", "password123", "New User", null);

        authService.register(request);

        ArgumentCaptor<UserSession> captor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionRepository).save(captor.capture());
        assertEquals(Platform.WEB, captor.getValue().getPlatform());
    }

    @Test
    void registerWithAnExplicitPlatformRecordsItOnTheSession() {
        when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
        RegisterRequest request = new RegisterRequest("new@example.com", "password123", "New User", "phone");

        authService.register(request, Platform.ANDROID);

        ArgumentCaptor<UserSession> captor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionRepository).save(captor.capture());
        assertEquals(Platform.ANDROID, captor.getValue().getPlatform());
    }

    @Test
    void loginWithAnExplicitPlatformRecordsItOnTheSession() {
        User user = existingUser("user@example.com", "correct-password");
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        authService.login(new LoginRequest("user@example.com", "correct-password", null), Platform.IOS);

        ArgumentCaptor<UserSession> captor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionRepository).save(captor.capture());
        assertEquals(Platform.IOS, captor.getValue().getPlatform());
    }

    @Test
    void refreshCarriesThePlatformOfTheRotatedSessionForward() {
        User user = existingUser("user@example.com", "correct-password");
        user.setId(7L);
        UserSession session = new UserSession();
        session.setId(99L);
        session.setUserId(7L);
        session.setExpiresAt(LocalDateTime.now().plusDays(1));
        session.setRevoked(false);
        session.setPlatform(Platform.WINDOWS);

        when(userSessionRepository.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(userSessionRepository.consumeByTokenHash(anyString(), any())).thenReturn(1);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        authService.refresh("some-refresh-token");

        ArgumentCaptor<UserSession> captor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionRepository).save(captor.capture());
        assertEquals(Platform.WINDOWS, captor.getValue().getPlatform());
    }

    @Test
    void listActiveSessionsMapsRepositoryResultsToSummaries() {
        UserSession session = new UserSession();
        session.setId(1L);
        session.setUserId(7L);
        session.setDeviceLabel("Pixel 8");
        session.setPlatform(Platform.ANDROID);
        session.setCreatedAt(LocalDateTime.now().minusDays(1));
        session.setLastUsedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusDays(29));

        when(userSessionRepository.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(eq(7L), any()))
                .thenReturn(List.of(session));

        List<SessionSummaryResponse> summaries = authService.listActiveSessions(7L);

        assertEquals(1, summaries.size());
        assertEquals("Pixel 8", summaries.get(0).deviceLabel());
        assertEquals(Platform.ANDROID, summaries.get(0).platform());
    }

    @Test
    void revokeSessionRevokesWhenOwnedByTheCaller() {
        UserSession session = new UserSession();
        session.setId(5L);
        session.setUserId(7L);
        session.setRevoked(false);
        when(userSessionRepository.findById(5L)).thenReturn(Optional.of(session));

        authService.revokeSession(7L, 5L);

        assertTrue(session.isRevoked());
    }

    @Test
    void revokeSessionThrowsNotFoundWhenOwnedByAnotherUser() {
        UserSession session = new UserSession();
        session.setId(5L);
        session.setUserId(999L);
        when(userSessionRepository.findById(5L)).thenReturn(Optional.of(session));

        assertThrows(ResourceNotFoundException.class, () -> authService.revokeSession(7L, 5L));
    }

    @Test
    void revokeSessionThrowsNotFoundWhenSessionDoesNotExist() {
        when(userSessionRepository.findById(5L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.revokeSession(7L, 5L));
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
