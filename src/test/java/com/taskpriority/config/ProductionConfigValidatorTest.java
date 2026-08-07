package com.taskpriority.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionConfigValidatorTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
            .withUserConfiguration(ProductionConfigValidator.class);

    @Test
    void startsSuccessfullyWithCompleteValidConfiguration() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com,https://admin.example.com",
                        "spring.data.redis.host=redis.internal",
                        "app.notifications.dispatch-batch-size=50",
                        "app.notifications.max-dispatch-attempts=5",
                        "app.notifications.processing-lease-timeout-minutes=5")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void acceptsAnEffectiveSpringRedisHostFromAnyPropertySource() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com",
                        "spring.data.redis.host=redis-from-command-line.example")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void failsWhenCorsOriginsIsEmpty() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=",
                        "spring.data.redis.host=redis.internal")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void failsWhenRedisHostIsNotSet() {
        runner.withPropertyValues("app.cors.allowed-origins=https://app.example.com")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("spring.data.redis.host"));
    }

    @Test
    void failsWhenCorsOriginsIsWildcard() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=*",
                        "spring.data.redis.host=redis.internal")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("app.cors.allowed-origins")
                        .hasMessageContaining("wildcard"));
    }

    @Test
    void failsWhenCorsOriginsContainsAWildcardAlongsideRealOrigins() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com,*",
                        "spring.data.redis.host=redis.internal")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void failsWhenDispatchBatchSizeIsNotPositive() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://app.example.com",
                        "spring.data.redis.host=redis.internal",
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
                        "spring.data.redis.host=redis.internal",
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
                        "spring.data.redis.host=redis.internal",
                        "app.notifications.processing-lease-timeout-minutes=0")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("app.notifications.processing-lease-timeout-minutes"));
    }

    @Test
    void errorMessageNeverContainsTheConfiguredOriginValue() {
        runner.withPropertyValues(
                        "app.cors.allowed-origins=https://internal-admin.example.com,*",
                        "spring.data.redis.host=redis.internal")
                .run(context -> assertThat(context)
                        .getFailure()
                        .rootCause()
                        .hasMessageNotContaining("internal-admin"));
    }
}
