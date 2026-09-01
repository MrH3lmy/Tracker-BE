package com.taskpriority.task.api;

import com.taskpriority.model.AppSetting;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.AppSettingRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.settings.SettingsService;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Deterministic coverage for issue #286's timezone requirement, using a fixed {@link Clock}
 * (overridden below) instead of a real "Pacific/Kiritimati vs whatever the server happens to be
 * running as" comparison - that older approach only proved anything on the (likely, not
 * guaranteed) days the two actually disagreed. In its own test class because overriding the Clock
 * bean would otherwise affect every LocalDate.now()-based assertion in TodayIntegrationTest.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class TodayTimezoneClockIntegrationTest {

    // Fixed over a year past this repo's "current" date, so it can never coincide with the real
    // wall-clock date at test-run time - if TodayService reverts to bare LocalDate.now()
    // (ignoring the injected Clock entirely), the response date won't match FIXED_ACCOUNT_DATE
    // below and the test fails.
    private static final Instant FIXED_INSTANT = Instant.parse("2027-03-15T22:00:00Z");
    // The injected Clock's own zone is UTC, deliberately different from the account's configured
    // zone - if TodayService uses the Clock but forgets to apply the account's zone (e.g.
    // LocalDate.now(clock) instead of LocalDate.now(clock.withZone(accountZone))), it would fall
    // back to the clock's own UTC zone and get 2027-03-15, not the account zone's 2027-03-16.
    private static final ZoneId ACCOUNT_ZONE = ZoneId.of("Pacific/Kiritimati");
    private static final LocalDate FIXED_ACCOUNT_DATE = LocalDate.ofInstant(FIXED_INSTANT, ACCOUNT_ZONE);

    @TestConfiguration
    static class FixedClockConfig {
        // Named differently from the production ClockConfig.clock() bean (same @Bean name would
        // collide - Spring Boot disallows bean-definition overriding by default); @Primary is
        // what actually makes autowiring prefer this one over the production bean.
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(FIXED_INSTANT, ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired AppSettingRepository appSettingRepository;

    @Test
    void dateBoundaryUsesTheAccountsConfiguredTimezoneAtTheInjectedClocksInstant() throws Exception {
        User alice = TestAuthSupport.loginAsNewUser(userRepository);

        AppSetting setting = new AppSetting();
        setting.setUserId(alice.getId());
        setting.setKey(SettingsService.TIMEZONE_KEY);
        setting.setValue(ACCOUNT_ZONE.getId());
        appSettingRepository.save(setting);

        Task task = new Task("Due per account timezone");
        task.setUserId(alice.getId());
        task.setStatus(Status.NOT_STARTED);
        task.setPosition(1000);
        task.setDueDate(FIXED_ACCOUNT_DATE);
        Task saved = taskRepository.save(task);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(FIXED_ACCOUNT_DATE.toString()))
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].task.id").value(saved.getId()))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("DUE_TODAY"));
    }
}
