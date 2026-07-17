package com.taskpriority.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class HabitsMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("taskpriority")
            .withUsername("taskpriority")
            .withPassword("taskpriority");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
    }

    @Autowired
    JdbcTemplate jdbcTemplate;

    private void migrateTo(String target) {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .target(target)
                .load()
                .migrate();
    }

    @Test
    void migratesRecurringDailyTargetTaskIntoHabitAndLeavesPlainRecurringTaskAlone() {
        jdbcTemplate.execute("DROP SCHEMA public CASCADE");
        jdbcTemplate.execute("CREATE SCHEMA public");

        migrateTo("23");

        jdbcTemplate.update(
                "INSERT INTO recurrence_rules (id, frequency, rule_interval, next_due_date, last_completed_date, current_streak, longest_streak) "
                        + "VALUES (1, 'DAILY', 1, ?, ?, 3, 5)",
                LocalDate.now(), LocalDate.now().minusDays(1));
        jdbcTemplate.update(
                "INSERT INTO tasks (id, title, description, area, effort, status, important, deleted, daily_target_count, recurrence_rule_id) "
                        + "VALUES (1, 'Drink water', 'Stay hydrated', 'PERSONAL', 'QUICK', 'NOT_STARTED', false, false, 8, 1)");
        jdbcTemplate.update("INSERT INTO task_check_ins (task_id, check_in_date) VALUES (1, ?)", LocalDate.now());
        jdbcTemplate.update("INSERT INTO task_check_ins (task_id, check_in_date) VALUES (1, ?)", LocalDate.now());
        jdbcTemplate.update(
                "INSERT INTO task_schedules (task_id, scheduled_date, start_time, duration_minutes, priority_level) "
                        + "VALUES (1, ?, '08:00:00', 15, 'MEDIUM')",
                LocalDate.now());

        // Plain recurring task with no daily-target check-in behavior must be left untouched.
        jdbcTemplate.update(
                "INSERT INTO recurrence_rules (id, frequency, rule_interval, next_due_date) VALUES (2, 'MONTHLY', 1, ?)",
                LocalDate.now().plusMonths(1));
        jdbcTemplate.update(
                "INSERT INTO tasks (id, title, area, effort, status, important, deleted, recurrence_rule_id) "
                        + "VALUES (2, 'Pay rent', 'PERSONAL', 'QUICK', 'NOT_STARTED', false, false, 2)");

        migrateTo("latest");

        List<Map<String, Object>> habits = jdbcTemplate.queryForList("SELECT * FROM habits");
        assertThat(habits).hasSize(1);
        assertThat(habits.get(0).get("title")).isEqualTo("Drink water");
        assertThat(((Number) habits.get(0).get("daily_target_count")).intValue()).isEqualTo(8);
        assertThat(((Number) habits.get(0).get("recurrence_rule_id")).longValue()).isEqualTo(1L);
        long habitId = ((Number) habits.get(0).get("id")).longValue();

        Integer checkInCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM habit_check_ins WHERE habit_id = ?", Integer.class, habitId);
        assertThat(checkInCount).isEqualTo(2);

        Integer scheduleCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM habit_schedules WHERE habit_id = ?", Integer.class, habitId);
        assertThat(scheduleCount).isEqualTo(1);

        Integer remainingOriginalTask = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM tasks WHERE id = 1", Integer.class);
        assertThat(remainingOriginalTask).isEqualTo(0);

        Integer plainRecurringTaskCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM tasks WHERE id = 2", Integer.class);
        assertThat(plainRecurringTaskCount).isEqualTo(1);
        Long plainTaskRuleId = jdbcTemplate.queryForObject("SELECT recurrence_rule_id FROM tasks WHERE id = 2", Long.class);
        assertThat(plainTaskRuleId).isEqualTo(2L);

        Integer columnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'daily_target_count'",
                Integer.class);
        assertThat(columnCount).isZero();

        Integer taskCheckInsTableCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'task_check_ins'",
                Integer.class);
        assertThat(taskCheckInsTableCount).isZero();
    }
}
