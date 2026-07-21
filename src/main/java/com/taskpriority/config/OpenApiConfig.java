package com.taskpriority.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Tracker-BE API",
                version = "v1",
                description = "Task-priority tracker REST API: task CRUD, recurrence, prioritization/matrix views, "
                        + "planning, calendar export, settings, CSV import, and the sticky-notes subsystem."
        )
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT access token issued by /api/v1/auth/login or /api/v1/auth/register."
)
public class OpenApiConfig {

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI().addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
