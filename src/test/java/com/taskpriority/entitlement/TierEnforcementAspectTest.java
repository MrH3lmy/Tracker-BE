package com.taskpriority.entitlement;

import com.taskpriority.auth.AuthenticatedUser;
import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TierEnforcementAspectTest {
    private CurrentUserService currentUserService;
    private TierEnforcementAspect aspect;

    @BeforeEach
    void setUp() {
        currentUserService = mock(CurrentUserService.class);
        aspect = new TierEnforcementAspect(currentUserService);
    }

    @Test
    void proceedsWhenUserMeetsRequiredTier() throws Throwable {
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(1L, "premium@example.com", Tier.PREMIUM, Role.USER));

        ProceedingJoinPoint joinPoint = mockJoinPointFor("premiumOnlyMethod", Tier.PREMIUM);
        when(joinPoint.proceed()).thenReturn("ok");

        Object result = aspect.enforce(joinPoint);

        assertEquals("ok", result);
        verify(joinPoint).proceed();
    }

    @Test
    void throwsWhenUserBelowRequiredTier() throws Throwable {
        when(currentUserService.requireUser()).thenReturn(new AuthenticatedUser(2L, "free@example.com", Tier.FREE, Role.USER));

        ProceedingJoinPoint joinPoint = mockJoinPointFor("premiumOnlyMethod", Tier.PREMIUM);

        assertThrows(EntitlementException.class, () -> aspect.enforce(joinPoint));
    }

    private ProceedingJoinPoint mockJoinPointFor(String methodName, Tier requiredTier) throws NoSuchMethodException {
        Method method = TargetWithGate.class.getDeclaredMethod(methodName);
        ProceedingJoinPoint joinPoint = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.getMethod()).thenReturn(method);
        return joinPoint;
    }

    private static class TargetWithGate {
        @RequiresTier(Tier.PREMIUM)
        void premiumOnlyMethod() {}
    }
}
