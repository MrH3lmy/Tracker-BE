package com.taskpriority.config;

import com.taskpriority.TaskPriorityBackendApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Full-context proof of issue #259's core acceptance criteria: starting with the {@code prod}
 * profile and a complete configuration succeeds, and removing any one required variable fails
 * immediately rather than falling back to a development default (localhost Postgres, wildcard
 * CORS, etc.). A real Postgres is needed for the "succeeds" case - {@code prod} has no H2/
 * local-test-style fallback, by design.
 */
@Testcontainers(disabledWithoutDocker = true)
class ProductionProfileStartupPostgresTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("taskpriority")
            .withUsername("taskpriority")
            .withPassword("taskpriority");

    private Map<String, Object> completeValidProperties() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("DB_URL", postgres.getJdbcUrl());
        properties.put("DB_USERNAME", postgres.getUsername());
        properties.put("DB_PASSWORD", postgres.getPassword());
        properties.put("JWT_SECRET", "integration-test-only-jwt-signing-secret-0123456789");
        properties.put("CORS_ALLOWED_ORIGINS", "https://app.example.com");
        properties.put("REDIS_HOST", "localhost");
        // Scheduled jobs would otherwise start mutating data against this short-lived container.
        properties.put("REMINDERS_SCHEDULING_ENABLED", "false");
        return properties;
    }

    private void run(Map<String, Object> properties) {
        ConfigurableApplicationContext context = new SpringApplicationBuilder(TaskPriorityBackendApplication.class)
                .web(WebApplicationType.NONE)
                .profiles("prod")
                .properties(properties.entrySet().stream()
                        .map(e -> e.getKey() + "=" + e.getValue())
                        .toArray(String[]::new))
                .run();
        context.close();
    }

    @Test
    void startsSuccessfullyWithACompleteProductionConfiguration() {
        assertDoesNotThrow(() -> run(completeValidProperties()));
    }

    @Test
    void failsImmediatelyWithoutDbUrl() {
        Map<String, Object> properties = completeValidProperties();
        properties.remove("DB_URL");
        assertThrows(Exception.class, () -> run(properties));
    }

    @Test
    void failsImmediatelyWithoutDbUsername() {
        Map<String, Object> properties = completeValidProperties();
        properties.remove("DB_USERNAME");
        assertThrows(Exception.class, () -> run(properties));
    }

    @Test
    void failsImmediatelyWithoutDbPassword() {
        Map<String, Object> properties = completeValidProperties();
        properties.remove("DB_PASSWORD");
        assertThrows(Exception.class, () -> run(properties));
    }

    // No failsImmediatelyWithoutJwtSecret case here: SpringApplicationBuilder#properties() adds a
    // low-priority "default properties" source, which OS environment variables always outrank -
    // and this repo's own ci.yml sets JWT_SECRET as a real OS env var for the whole `mvn verify`
    // step (other tests need it), so "removing" it from this test's property map can't actually
    // make it absent in this environment. JwtService#init's blank/short-secret rejection is
    // covered directly and reliably at the unit level instead - see JwtServiceTest.

    @Test
    void failsImmediatelyWithoutCorsAllowedOrigins() {
        Map<String, Object> properties = completeValidProperties();
        properties.remove("CORS_ALLOWED_ORIGINS");
        assertThrows(Exception.class, () -> run(properties));
    }

    @Test
    void failsImmediatelyWithoutRedisHost() {
        Map<String, Object> properties = completeValidProperties();
        properties.remove("REDIS_HOST");
        assertThrows(Exception.class, () -> run(properties));
    }

    @Test
    void failsImmediatelyWithAWildcardCorsOrigin() {
        Map<String, Object> properties = completeValidProperties();
        properties.put("CORS_ALLOWED_ORIGINS", "*");
        assertThrows(Exception.class, () -> run(properties));
    }
}
