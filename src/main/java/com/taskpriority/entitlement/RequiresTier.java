package com.taskpriority.entitlement;

import com.taskpriority.model.Tier;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a service method as requiring at least the given {@link Tier}. Enforced by
 * {@link TierEnforcementAspect}. Spring AOP proxies don't intercept same-class self-invocation -
 * annotated methods must always be called through the injected bean, never via {@code this.method()}.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequiresTier {
    Tier value();
}
