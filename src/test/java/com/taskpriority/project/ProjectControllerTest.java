package com.taskpriority.project;

import com.taskpriority.model.Project;
import com.taskpriority.model.ProjectStatus;
import com.taskpriority.task.api.TaskApiMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private ProjectApiMapper mapper;

    @MockBean
    private TaskApiMapper taskApiMapper;

    private Project project() {
        Project project = new Project("Website relaunch");
        project.setId(1L);
        project.setStatus(ProjectStatus.ACTIVE);
        project.setCreatedDate(LocalDateTime.now());
        return project;
    }

    private ProjectResponse response() {
        return new ProjectResponse(1L, "Website relaunch", null, ProjectStatus.ACTIVE, null, null, null, null, 1L, LocalDateTime.now());
    }

    @Test
    void allReturnsProjectsForTheCurrentUser() throws Exception {
        when(projectService.findAll()).thenReturn(List.of(project()));
        when(mapper.toResponse(any(Project.class))).thenReturn(response());

        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Website relaunch"));
    }

    @Test
    void createReturnsCreatedWithLocationBody() throws Exception {
        when(projectService.create(any(CreateProjectRequest.class))).thenReturn(project());
        when(mapper.toResponse(any(Project.class))).thenReturn(response());

        mockMvc.perform(post("/api/v1/projects")
                        .contentType("application/json")
                        .content("{\"name\":\"Website relaunch\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Website relaunch"));
    }

    @Test
    void createRejectsBlankName() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType("application/json")
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void overviewReturnsComputedFields() throws Exception {
        ProjectOverviewResponse overview = new ProjectOverviewResponse(
                response(), 4, 2, 2, 0, 50, 4.0, 2.0, List.of(), 0, "LOW", "On track"
        );
        when(projectService.getOverview(1L)).thenReturn(overview);

        mockMvc.perform(get("/api/v1/projects/1/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressPercent").value(50))
                .andExpect(jsonPath("$.riskLevel").value("LOW"));
    }

    @Test
    void deleteReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/1"))
                .andExpect(status().isNoContent());
    }
}
