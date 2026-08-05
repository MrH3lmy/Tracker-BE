package com.taskpriority.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionConfigValidatorTest {

    // ProductionConfigValidator is @Profile("prod") - ApplicationContextRunner activates no
    // profile by default, so the bean (and therefore its @PostConstruct check) would silently
    // never run without this.
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
            .withUserConfiguration(ProductionConfigValidator.class);

    @Test
    void startsSuccessfullyWithCompleteValidConfiguration() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com,https://admin.example.com",
                        "REDIS_HOST=redis.internal",
                        "app.notifications.dispatch-batch-size=50",
                        "app.notifications.max-dispatch-attempts=5",
                        "app.notifications.processing-lease-timeout-minutes=5")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void failsWhenCorsOriginsIsEmpty() {
        runner.withPropertyValues("app.cors.allowed-origins=", "REDIS_HOST=redis.internal")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void failsWhenRedisHostIsNotSet() {
        // RedisProperties has its own Java-level "localhost" default that silently wins over an
        // unresolvable spring.data.redis.host placeholder (see application-prod.properties and the
        // class comment) - REDIS_HOST is checked directly here instead of trusting that placeholder.
        runner.withPropertyValues("app.cors.allowed-origins=https://app.example.com")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("REDIS_HOST"));
    }

    @Test
    void failsWhenCorsOriginsIsWildcard() {
        runner.withPropertyValues("app.cors.allowed-origins=*")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("app.cors.allowed-origins")
                        .hasMessageContaining("wildcard"));
    }

    @Test
    void failsWhenCorsOriginsContainsAWildcardAlongsideRealOrigins() {
        runner.withPropertyValues("app.cors.allowed-origins=https://app.example.com,*")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void failsWhenDispatchBatchSizeIsNotPositive() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com",
                        "app.notifications.dispatch-batch-size=0")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("app.notifications.dispatch-batch-size"));
    }

    @Test
    void failsWhenMaxDispatchAttemptsIsNegative() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com",
                        "app.notifications.max-dispatch-attempts=-1")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("app.notifications.max-dispatch-attempts"));
    }

    @Test
    void failsWhenProcessingLeaseTimeoutIsNotPositive() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com",
                        "app.notifications.processing-lease-timeout-minutes=0")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("app.notifications.processing-lease-timeout-minutes"));
    }

    @Test
    void errorMessageNeverContainsTheConfiguredOriginValue() {
        // The CORS value itself isn't secret, but this validator's error-formatting policy is
        // deliberately "never echo the offending value" across every check (see the class
        // comment) - this guards the wildcard branch specifically, since a message like
        // "the value 'https://internal-admin.example.com,*' is invalid" is exactly the kind of
        // detail that shouldn't leak into logs for any future check added here that IS secret.
        runner.withPropertyValues("app.cors.allowed-origins=https://internal-admin.example.com,*")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageNotContaining("internal-admin"));
    }
}
