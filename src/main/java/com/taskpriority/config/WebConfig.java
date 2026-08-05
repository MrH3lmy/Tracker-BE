package com.taskpriority.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig {
    private final String[] allowedOrigins;

    public WebConfig(@Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CorsFilter corsFilter() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        // Content-Disposition: attachment download filenames. X-Total-Count/X-Total-Pages/X-Page/
        // X-Page-Size/X-Has-Next: pagination metadata for GET /api/v1/tasks and /tasks/archive
        // (see TaskControllerV1) - browsers don't expose custom response headers to JS by default
        // even same-origin-via-CORS, so these need to be listed explicitly or the frontend can't
        // read them.
        configuration.setExposedHeaders(List.of(
                "Content-Disposition", "X-Total-Count", "X-Total-Pages", "X-Page", "X-Page-Size", "X-Has-Next"));
        configuration.setMaxAge(3600L);
        // Required for the browser to send/receive the HttpOnly refresh-token cookie cross-origin
        // (frontend and backend run on different ports even in local dev). Safe only because
        // allowedOrigins is always an explicit list, never "*" - CORS forbids combining
        // allowCredentials(true) with a wildcard origin, and Spring enforces that at request time.
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return new CorsFilter(source);
    }
}
