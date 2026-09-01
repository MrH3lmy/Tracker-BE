package com.taskpriority.project;

import com.taskpriority.model.Project;
import com.taskpriority.model.User;
import com.taskpriority.repository.ProjectActivityRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Issue #288's transactional requirement: if the activity write fails, the domain mutation it was
 * meant to accompany must roll back too, not partially commit. Deliberately NOT @Transactional at
 * the test-class level (that would mask this with the test's own rollback) - the request goes
 * through a real MockMvc call so the controller's own @Transactional boundary is what's exercised,
 * and the assertion after it opens a fresh read to see what's really durably persisted.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
class ProjectActivityTransactionRollbackTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskRepository taskRepository;

    @MockBean
    ProjectActivityRepository projectActivityRepository;

    @Test
    void taskUpdateRollsBackWhenActivityWriteFails() throws Exception {
        User alice = TestAuthSupport.loginAsNewUser(userRepository);
        Project project = new Project("Platform");
        project.setUserId(alice.getId());
        Long projectId = projectRepository.save(project).getId();

        com.taskpriority.model.Task task = new com.taskpriority.model.Task("Original title");
        task.setUserId(alice.getId());
        task.setStatus(com.taskpriority.model.Status.NOT_STARTED);
        task.setPosition(1000);
        task.setProjectId(projectId);
        Long taskId = taskRepository.save(task).getId();

        when(projectActivityRepository.save(any())).thenThrow(new RuntimeException("simulated activity write failure"));

        String body = """
                {"title":"Hijacked title","status":"NOT_STARTED"}
                """;
        mockMvc.perform(put("/api/v1/tasks/{id}", taskId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is5xxServerError());

        // Read outside the failed request's (rolled-back) transaction: the title update must not
        // have survived even though it happened before the activity write inside the same method.
        assertThat(taskRepository.findById(taskId).orElseThrow().getTitle()).isEqualTo("Original title");
    }
}
