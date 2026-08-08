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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EntitlementService entitlementService;
    private final NoteTemplateService noteTemplateService;
    private final BoardProvisioningService boardProvisioningService;
    private final SessionRevocationService sessionRevocationService;
    private final long refreshTokenTtlDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            UserSessionRepository userSessionRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EntitlementService entitlementService,
            NoteTemplateService noteTemplateService,
            BoardProvisioningService boardProvisioningService,
            SessionRevocationService sessionRevocationService,
            @Value("${app.security.jwt.refresh-token-ttl-days:30}") long refreshTokenTtlDays
    ) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.entitlementService = entitlementService;
        this.noteTemplateService = noteTemplateService;
        this.boardProvisioningService = boardProvisioningService;
        this.sessionRevocationService = sessionRevocationService;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        return register(request, Platform.WEB);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, Platform platform) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName());
        user.setTier(Tier.FREE);
        user.setRole(Role.USER);
        user = userRepository.save(user);
        noteTemplateService.seedDefaultTemplatesForUser(user.getId());
        boardProvisioningService.provisionDefaultBoardForUser(user.getId());
        return issueSession(user, request.deviceLabel(), UUID.randomUUID(), platform);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        return login(request, Platform.WEB);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, Platform platform) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }
        return issueSession(user, request.deviceLabel(), UUID.randomUUID(), platform);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String presentedHash = sha256(rawRefreshToken);
        // Load first (for userId/deviceLabel/familyId) then atomically consume via a conditional
        // UPDATE. The UPDATE - not this read - is what makes rotation exactly-once: concurrent
        // callers presenting the same token will both reach this point seeing revoked=false (a
        // plain SELECT never blocks), but only one of their UPDATEs will actually flip the row,
        // because Postgres serializes concurrent UPDATEs against the same row and re-evaluates the
        // WHERE clause after the first commits. The loser's UPDATE affects 0 rows and is rejected
        // below with the same generic error as an unknown/expired token.
        UserSession session = userSessionRepository.findByTokenHash(presentedHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired refresh token."));

        int consumed = userSessionRepository.consumeByTokenHash(presentedHash, LocalDateTime.now());
        if (consumed == 0) {
            // session.isRevoked() was already true at the SELECT above (not just flipped by a
            // concurrent winner we lost a race against) means this exact token was consumed in an
            // earlier, already-committed rotation - a legitimate client would never present a
            // token again after receiving its replacement, so this is a strong signal the token
            // was stolen. Revoke every session descended from the same login, not just this one
            // presented token, so the thief's downstream (already-rotated-to) session dies too.
            if (session.isRevoked()) {
                sessionRevocationService.revokeFamily(session.getFamilyId());
            }
            throw new IllegalArgumentException("Invalid or expired refresh token.");
        }

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired refresh token."));

        return issueSession(user, session.getDeviceLabel(), session.getFamilyId(), session.getPlatform());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        String presentedHash = sha256(rawRefreshToken);
        userSessionRepository.findByTokenHash(presentedHash).ifPresent(session -> {
            session.setRevoked(true);
            userSessionRepository.save(session);
        });
    }

    @Transactional
    public void logoutAll(Long userId) {
        userSessionRepository.findByUserIdAndRevokedFalse(userId).forEach(session -> session.setRevoked(true));
    }

    /**
     * Active (unrevoked, unexpired) sessions for the current user across every platform/device,
     * oldest-activity first (same ordering {@link com.taskpriority.entitlement.EntitlementService#enforceSessionCap}
     * already relies on to evict the least-recently-used session first) - see
     * {@link SessionSummaryResponse}. Callers only ever see their own sessions; the query itself
     * is scoped by {@code userId} rather than filtering afterward.
     */
    @Transactional(readOnly = true)
    public List<SessionSummaryResponse> listActiveSessions(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return userSessionRepository.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByLastUsedAtAsc(userId, now)
                .stream()
                .map(SessionSummaryResponse::from)
                .toList();
    }

    /**
     * Revokes one session by id on behalf of {@code userId} - e.g. "sign out that lost phone"
     * without touching every other device. Ownership is enforced here (not just at the repository
     * query level) so a session belonging to a different user surfaces as "not found" rather than
     * leaking whether the id exists at all.
     */
    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        UserSession session = userSessionRepository.findById(sessionId)
                .filter(candidate -> candidate.getUserId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found."));
        session.setRevoked(true);
    }

    private AuthResponse issueSession(User user, String deviceLabel, UUID familyId, Platform platform) {
        entitlementService.enforceSessionCap(user.getId(), user.getTier());

        String rawRefreshToken = generateOpaqueToken();
        UserSession session = new UserSession();
        session.setUserId(user.getId());
        session.setTokenHash(sha256(rawRefreshToken));
        session.setDeviceLabel(deviceLabel);
        session.setFamilyId(familyId);
        session.setPlatform(platform);
        session.setExpiresAt(LocalDateTime.now().plus(refreshTokenTtlDays, ChronoUnit.DAYS));
        userSessionRepository.save(session);

        String accessToken = jwtService.issueAccessToken(user.getId(), user.getEmail(), user.getTier(), user.getRole());
        return new AuthResponse(accessToken, rawRefreshToken, UserResponse.from(user));
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
