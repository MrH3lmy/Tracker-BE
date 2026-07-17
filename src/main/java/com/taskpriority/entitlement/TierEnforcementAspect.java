package com.taskpriority.entitlement;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.model.Tier;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
public class TierEnforcementAspect {
    private final CurrentUserService currentUserService;

    public TierEnforcementAspect(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @Around("@annotation(com.taskpriority.entitlement.RequiresTier)")
    public Object enforce(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequiresTier requiresTier = method.getAnnotation(RequiresTier.class);

        Tier currentTier = currentUserService.requireUser().tier();
        if (currentTier.rank() < requiresTier.value().rank()) {
            throw new EntitlementException(
                    "This feature requires a " + requiresTier.value().name() + " subscription.");
        }
        return joinPoint.proceed();
    }
}
