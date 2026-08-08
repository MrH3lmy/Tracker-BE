package com.taskpriority.auth;

import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for GitHub issue #257: the refresh token now travels only via an HttpOnly
 * {@code refreshToken} cookie (see AuthController), never in the JSON response body or a request
 * body field.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class AuthControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    private String uniqueEmail() {
        return "auth-test-" + System.nanoTime() + "@example.com";
    }

    @Test
    void registerCreatesUserAndReturnsAccessTokenWithRefreshTokenOnlyInTheCookie() throws Exception {
        String email = uniqueEmail();
        String body = """
                {"email":"%s","password":"correct-horse","displayName":"Test User","deviceLabel":"unit-test"}
                """.formatted(email);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.displayName").value("Test User"))
                .andExpect(jsonPath("$.user.tier").value("FREE"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.id").isNumber())
                .andReturn();

        Cookie refreshCookie = result.getResponse().getCookie(AuthController.REFRESH_TOKEN_COOKIE_NAME);
        assertThat(refreshCookie).isNotNull();
        assertThat(refreshCookie.getValue()).isNotBlank();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.getPath()).isEqualTo("/api/v1/auth");
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
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();
        Cookie loginRefreshCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_TOKEN_COOKIE_NAME);
        assertThat(loginRefreshCookie).isNotNull();

        // refresh - the cookie is the only credential needed, no request body
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh").cookie(loginRefreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();
        Cookie rotatedRefreshCookie = refreshResult.getResponse().getCookie(AuthController.REFRESH_TOKEN_COOKIE_NAME);
        assertThat(rotatedRefreshCookie).isNotNull();
        assertThat(rotatedRefreshCookie.getValue()).isNotEqualTo(loginRefreshCookie.getValue());

        // the old (login) refresh cookie is now revoked - a second refresh attempt with it fails
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(loginRefreshCookie))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));

        // logout with the current (post-refresh) cookie
        MvcResult logoutResult = mockMvc.perform(post("/api/v1/auth/logout").cookie(rotatedRefreshCookie))
                .andExpect(status().isNoContent())
                .andReturn();
        assertCookieCleared(logoutResult.getResponse());

        // a second use of the same refresh cookie now fails since logout revoked it
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(rotatedRefreshCookie))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));

        // logout-all requires an authenticated user and also clears this browser's cookie
        TestAuthSupport.loginAsNewUser(userRepository);
        MvcResult logoutAllResult = mockMvc.perform(post("/api/v1/auth/logout-all"))
                .andExpect(status().isNoContent())
                .andReturn();
        assertCookieCleared(logoutAllResult.getResponse());
    }

    @Test
    void refreshWithoutACookieReturns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));
    }

    @Test
    void refreshWithUnknownTokenReturns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(AuthController.REFRESH_TOKEN_COOKIE_NAME, "not-a-real-token")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token."));
    }

    @Test
    void refreshWithDisallowedOriginIsRejected() throws Exception {
        String email = uniqueEmail();
        registerUser(email, "correct-horse");
        String loginBody = """
                {"email":"%s","password":"correct-horse"}
                """.formatted(email);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andReturn();
        Cookie refreshCookie = loginResult.getResponse().getCookie(AuthController.REFRESH_TOKEN_COOKIE_NAME);

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie).header("Origin", "https://evil.example.com"))
                .andExpect(status().isForbidden());

        // the legitimate frontend origin still works with the same cookie
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie).header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk());
    }

    @Test
    void logoutWithDisallowedOriginIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout").header("Origin", "https://evil.example.com"))
                .andExpect(status().isForbidden());
    }

    @Test
    void logoutWithoutACookieIsStillNoContent() throws Exception {
        // logout is best-effort: no cookie (or an unrecognized token) doesn't error, per AuthService.logout
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isNoContent());
    }

    @Test
    void logoutAllWithoutAuthenticationReturns401() throws Exception {
        // Only register/login/refresh/logout are explicitly permitAll() in SecurityConfig (issue
        // #257) - logout-all falls through to anyRequest().authenticated(), so an unauthenticated
        // request is stopped by Spring Security's authenticationEntryPoint before it ever reaches
        // the controller, rather than reaching CurrentUserService.requireUserId() and surfacing as
        // an unmapped IllegalStateException (a 500) the way it used to.
        mockMvc.perform(post("/api/v1/auth/logout-all"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication is required."));
    }

    private void assertCookieCleared(MockHttpServletResponse response) {
        Cookie cleared = response.getCookie(AuthController.REFRESH_TOKEN_COOKIE_NAME);
        assertThat(cleared).isNotNull();
        assertThat(cleared.getMaxAge()).isEqualTo(0);
    }

    private void registerUser(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }
}
