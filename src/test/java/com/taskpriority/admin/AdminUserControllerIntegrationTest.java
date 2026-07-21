package com.taskpriority.admin;

import com.taskpriority.model.Role;
import com.taskpriority.model.Tier;
import com.taskpriority.model.User;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for AdminUserController against H2, exercising the actual
 * UserRepository + EntitlementService + method-security (@PreAuthorize("hasRole('ADMIN')"))
 * stack, unlike AdminUserControllerTest which mocks everything out.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class AdminUserControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;

    private User persistTargetUser() {
        User target = new User();
        target.setEmail("admin-target-" + System.nanoTime() + "@example.com");
        target.setPasswordHash("irrelevant-for-these-tests");
        target.setTier(Tier.FREE);
        target.setRole(Role.USER);
        return userRepository.save(target);
    }

    @Test
    void adminCanUpdateAnotherUsersTierAndItPersists() throws Exception {
        TestAuthSupport.loginAsNewUser(userRepository, Role.ADMIN);
        User target = persistTargetUser();

        mockMvc.perform(put("/api/v1/admin/users/{id}/tier", target.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tier\":\"PREMIUM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(target.getId().intValue()))
                .andExpect(jsonPath("$.email").value(target.getEmail()))
                .andExpect(jsonPath("$.tier").value("PREMIUM"));

        User reloaded = userRepository.findById(target.getId()).orElseThrow();
        assertEquals(Tier.PREMIUM, reloaded.getTier());
    }

    @Test
    void updateTierReturnsBadRequestWhenTierMissing() throws Exception {
        TestAuthSupport.loginAsNewUser(userRepository, Role.ADMIN);
        User target = persistTargetUser();

        mockMvc.perform(put("/api/v1/admin/users/{id}/tier", target.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("tier is required")))
                .andExpect(jsonPath("$.path").value("/api/v1/admin/users/" + target.getId() + "/tier"));
    }

    @Test
    void updateTierReturnsNotFoundForMissingUser() throws Exception {
        TestAuthSupport.loginAsNewUser(userRepository, Role.ADMIN);

        mockMvc.perform(put("/api/v1/admin/users/{id}/tier", 987654321L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tier\":\"PREMIUM\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("987654321")));
    }

    @Test
    void nonAdminUserIsForbiddenEvenForOwnAccount() throws Exception {
        User self = TestAuthSupport.loginAsNewUser(userRepository, Role.USER);

        mockMvc.perform(put("/api/v1/admin/users/{id}/tier", self.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tier\":\"PREMIUM\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value(containsString("permission")));
    }
}
