package com.taskpriority.auth;

import com.taskpriority.repository.UserSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Revokes a refresh-token family in its own, independently-committed transaction.
 * <p>
 * This has to be a separate bean/call: {@code AuthService#refresh} detects a replayed
 * already-consumed token and then throws to reject the request. If the family revocation ran in
 * that same {@code @Transactional} method, Spring's default rollback-on-RuntimeException would
 * undo the revocation along with everything else the moment that exception propagates - silently
 * discarding the exact security response the replay detection exists to produce. A plain
 * self-invocation from {@code AuthService} would bypass Spring's transactional proxy entirely
 * (the classic self-invocation pitfall), so this has to live on a different bean, called through
 * its proxy, for {@code Propagation.REQUIRES_NEW} to actually take effect.
 */
@Service
public class SessionRevocationService {
    private final UserSessionRepository userSessionRepository;

    public SessionRevocationService(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(UUID familyId) {
        userSessionRepository.revokeByFamilyId(familyId);
    }
}
