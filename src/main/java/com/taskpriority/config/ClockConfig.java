package com.taskpriority.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * A single injectable {@link Clock} bean so time-sensitive services (currently just
 * {@code TodayService}) can be tested with a fixed instant instead of the real wall clock, while
 * behaving exactly like {@code LocalDate.now()}/{@code Instant.now()} in production.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
