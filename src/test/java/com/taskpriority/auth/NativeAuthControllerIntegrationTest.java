package com.taskpriority.auth;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for the native-client authentication contract (issue #257): a dedicated
 * route tree that delivers the refresh token in the JSON body (never a cookie), reusing the exact
 * same {@link AuthService} rotation/replay-family/session-cap code the browser flow uses.
 */
// Isolated into its own Spring context via distinct rate-limit properties, same technique as
// AuthRateLimitIntegrationTest - this class makes far more real register/login HTTP calls than
// the shared-context default-profile tests budget for (they mostly use TestAuthSupport to create
// users directly, bypassing the rate limiter, specifically to avoid this), so it needs its own
// bucket rather than contending with (or being capped by) every other default-context test.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@TestPropertySource(properties = {
        "app.rate-limit.register.ip.max-attempts=50",
        "app.rate-limit.login.ip.max-attempts=50",
        "app.rate-limit.refresh.ip.max-attempts=50"
})
class NativeAuthControllerIntegrationTest {

    @Autowired MockMvc mockMvc;

    private String uniqueEmail() {
        return "native-auth-test-" + System.nanoTime() + "@example.com";
    }

    @Test
    void registerReturnsTheRefreshTokenInTheBodyAndSetsNoCookie() throws Exception {
        String email = uniqueEmail();
        String body = """
                {"email":"%s","password":"correct-horse","displayName":"Test User","deviceLabel":"pixel-8","platform":"ANDROID"}
                """.formatted(email);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/native/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn();

        assertThat(result.getResponse().getCookie(AuthController.REFRESH_TOKEN_COOKIE_NAME)).isNull();
    }

    @Test
    void registerWithoutAPlatformReturns400() throws Exception {
        String body = """
                {"email":"%s","password":"correct-horse"}
                """.formatted(uniqueEmail());

        mockMvc.perform(post("/api/v1/auth/native/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("platform")));
    }

    @Test
    void loginWithWrongPasswordReturns400() throws Exception {
        String email = uniqueEmail();
        registerNativeUser(email, "correct-horse", "IOS");

        String loginBody = """
                {"email":"%s","password":"totally-wrong","platform":"IOS"}
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/native/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void fullNativeSessionLifecycle_registerLoginRefreshLogoutLogoutAll() throws Exception {
        String email = uniqueEmail();

        // login (register already happened once for this email in a prior step would collide, so
        // register here and treat that as the initial session)
        String registerBody = """
                {"email":"%s","password":"correct-horse","deviceLabel":"desktop","platform":"WINDOWS"}
                """.formatted(email);
        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/native/register").contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isCreated())
                .andReturn();
        String refreshToken = readString(registerResult, "$.refreshToken");
        assertThat(refreshToken).isNotBlank();

        // refresh - the token travels in the body, gets rotated
        String refreshBody = """
                {"refreshToken":"%s"}
                """.formatted(refreshToken);
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/native/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();
        String rotatedRefreshToken = readString(refreshResult, "$.refreshToken");
        String accessToken = readString(refreshResult, "$.accessToken");
        assertThat(rotatedRefreshToken).isNotEqualTo(refreshToken);

        // replaying the old (pre-rotation) token now fails
        mockMvc.perform(post("/api/v1/auth/native/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));

        // logout with the current (rotated) token
        String logoutBody = """
                {"refreshToken":"%s"}
                """.formatted(rotatedRefreshToken);
        mockMvc.perform(post("/api/v1/auth/native/logout").contentType(MediaType.APPLICATION_JSON).content(logoutBody))
                .andExpect(status().isNoContent());

        // that token is now revoked - a second refresh attempt with it fails
        mockMvc.perform(post("/api/v1/auth/native/refresh").contentType(MediaType.APPLICATION_JSON).content(logoutBody))
                .andExpect(status().isBadRequest());

        // logout-all requires a bearer token (still valid - access tokens don't die at logout)
        mockMvc.perform(post("/api/v1/auth/native/logout-all").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void refreshWithAnUnknownTokenReturns400() throws Exception {
        String body = """
                {"refreshToken":"not-a-real-token"}
                """;
        mockMvc.perform(post("/api/v1/auth/native/refresh").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));
    }

    @Test
    void logoutWithoutABodyIsStillNoContent() throws Exception {
        mockMvc.perform(post("/api/v1/auth/native/logout"))
                .andExpect(status().isNoContent());
    }

    @Test
    void logoutAllWithoutAuthenticationReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/native/logout-all"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listSessionsWithoutAuthenticationReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/sessions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listSessionsReturnsOnlyTheCurrentUsersSessionsWithPlatformMetadata() throws Exception {
        String userAEmail = uniqueEmail();
        String userAAccessToken = registerNativeUser(userAEmail, "correct-horse", "MACOS");
        registerNativeUser(uniqueEmail(), "correct-horse", "LINUX"); // a different user - must not leak into A's list

        mockMvc.perform(get("/api/v1/auth/sessions").header("Authorization", "Bearer " + userAAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].platform").value("MACOS"))
                .andExpect(jsonPath("$[0].id").isNumber());
    }

    @Test
    void revokingOwnSessionInvalidatesItsRefreshToken() throws Exception {
        String email = uniqueEmail();
        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/native/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"correct-horse","platform":"ANDROID"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn();
        String accessToken = readString(registerResult, "$.accessToken");
        String refreshToken = readString(registerResult, "$.refreshToken");

        MvcResult sessionsResult = mockMvc.perform(get("/api/v1/auth/sessions").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn();
        Integer sessionId = JsonPath.read(sessionsResult.getResponse().getContentAsString(), "$[0].id");

        mockMvc.perform(delete("/api/v1/auth/sessions/" + sessionId).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/native/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(refreshToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void revokingAnotherUsersSessionReturns404() throws Exception {
        String victimEmail = uniqueEmail();
        MvcResult victimRegister = mockMvc.perform(post("/api/v1/auth/native/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"correct-horse","platform":"IOS"}
                                """.formatted(victimEmail)))
                .andExpect(status().isCreated())
                .andReturn();
        String victimAccessToken = readString(victimRegister, "$.accessToken");
        MvcResult victimSessions = mockMvc.perform(get("/api/v1/auth/sessions").header("Authorization", "Bearer " + victimAccessToken))
                .andReturn();
        Integer victimSessionId = JsonPath.read(victimSessions.getResponse().getContentAsString(), "$[0].id");

        String attackerAccessToken = registerNativeUser(uniqueEmail(), "correct-horse", "WEB");

        mockMvc.perform(delete("/api/v1/auth/sessions/" + victimSessionId).header("Authorization", "Bearer " + attackerAccessToken))
                .andExpect(status().isNotFound());
    }

    private String registerNativeUser(String email, String password, String platform) throws Exception {
        String body = """
                {"email":"%s","password":"%s","platform":"%s"}
                """.formatted(email, password, platform);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/native/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return readString(result, "$.accessToken");
    }

    private String readString(MvcResult result, String jsonPath) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), jsonPath);
    }
}
