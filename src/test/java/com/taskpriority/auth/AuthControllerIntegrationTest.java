package com.taskpriority.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class AuthControllerIntegrationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    private String uniqueEmail() {
        return "auth-test-" + System.nanoTime() + "@example.com";
    }

    @Test
    void registerCreatesUserAndReturnsTokens() throws Exception {
        String email = uniqueEmail();
        String body = """
                {"email":"%s","password":"correct-horse","displayName":"Test User","deviceLabel":"unit-test"}
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.displayName").value("Test User"))
                .andExpect(jsonPath("$.user.tier").value("FREE"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.id").isNumber());
    }

    @Test
    void registerWithMissingFieldsReturns400WithStandardErrorShape() throws Exception {
        String body = """
                {"email":"","password":"short"}
                """;

        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/api/v1/auth/register"));
    }

    @Test
    void registerWithDuplicateEmailReturns400() throws Exception {
        String email = uniqueEmail();
        String body = """
                {"email":"%s","password":"correct-horse","displayName":"First"}
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        String duplicateBody = """
                {"email":"%s","password":"another-password","displayName":"Second"}
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(duplicateBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("An account with this email already exists."));
    }

    @Test
    void loginWithWrongPasswordReturns400() throws Exception {
        String email = uniqueEmail();
        registerUser(email, "correct-horse");

        String loginBody = """
                {"email":"%s","password":"totally-wrong"}
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void loginWithUnknownEmailReturns400() throws Exception {
        String loginBody = """
                {"email":"nobody-%d@example.com","password":"whatever1"}
                """.formatted(System.nanoTime());

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void fullSessionLifecycle_registerLoginRefreshLogoutLogoutAll() throws Exception {
        String email = uniqueEmail();
        registerUser(email, "correct-horse");

        // login
        String loginBody = """
                {"email":"%s","password":"correct-horse","deviceLabel":"laptop"}
                """.formatted(email);
        String loginResponse = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        JsonNode loginJson = jsonMapper.readTree(loginResponse);
        String refreshToken = loginJson.get("refreshToken").asText();

        // refresh
        String refreshBody = """
                {"refreshToken":"%s"}
                """.formatted(refreshToken);
        String refreshResponse = mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        JsonNode refreshJson = jsonMapper.readTree(refreshResponse);
        String newRefreshToken = refreshJson.get("refreshToken").asText();

        // the old (login) refresh token is now revoked - a second refresh attempt with it fails
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));

        // logout with the current (post-refresh) refresh token
        String logoutBody = """
                {"refreshToken":"%s"}
                """.formatted(newRefreshToken);
        mockMvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content(logoutBody))
                .andExpect(status().isNoContent());

        // a second use of the same refresh token now fails since logout revoked it
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(logoutBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));

        // logout-all requires an authenticated user
        TestAuthSupport.loginAsNewUser(userRepository);
        mockMvc.perform(post("/api/v1/auth/logout-all"))
                .andExpect(status().isNoContent());
    }

    @Test
    void refreshWithUnknownTokenReturns400() throws Exception {
        String body = """
                {"refreshToken":"not-a-real-token"}
                """;
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));
    }

    @Test
    void logoutWithUnknownTokenIsStillNoContent() throws Exception {
        // logout is best-effort: an unrecognized token doesn't error, per AuthService.logout
        String body = """
                {"refreshToken":"not-a-real-token"}
                """;
        mockMvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent());
    }

    @Test
    void logoutAllWithoutAuthenticationFailsServerSide() throws Exception {
        // /api/v1/auth/** is permitAll() in SecurityConfig, so an unauthenticated request to
        // logout-all reaches the controller rather than being stopped by Spring Security's
        // authenticationEntryPoint. Authentication is enforced programmatically inside the
        // controller via CurrentUserService.requireUserId(), which throws IllegalStateException
        // when there is no authenticated principal - and GlobalExceptionHandler has no specific
        // mapping for that, so it falls through to the generic 500 handler. This test documents
        // that actual (if surprising) behavior rather than assuming a 401.
        mockMvc.perform(post("/api/v1/auth/logout-all"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500));
    }

    private void registerUser(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }
}
