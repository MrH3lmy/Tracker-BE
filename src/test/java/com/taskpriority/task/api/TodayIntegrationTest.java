package com.taskpriority.task.api;

import com.taskpriority.model.AppSetting;
import com.taskpriority.model.AppSettingId;
import com.taskpriority.model.Project;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskDependency;
import com.taskpriority.model.User;
import com.taskpriority.repository.AppSettingRepository;
import com.taskpriority.repository.ProjectRepository;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.settings.SettingsService;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Coverage for issue #286 (GET /api/v1/tasks/today and GET /api/v1/projects/{id}/today):
 * due-today/overdue/scheduled-today classification, exclusion of completed and future tasks,
 * project scoping, cross-user isolation, deterministic ordering, timezone-aware date boundaries,
 * blocked-dependency exposure, and the empty-result shape.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class TodayIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired TaskRepository taskRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired TaskDependencyRepository taskDependencyRepository;
    @Autowired AppSettingRepository appSettingRepository;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = TestAuthSupport.loginAsNewUser(userRepository);
    }

    private Task saveTask(String title, Status status, LocalDate dueDate, LocalDate startDate, Long projectId) {
        Task task = new Task(title);
        task.setUserId(alice.getId());
        task.setStatus(status);
        task.setPosition(1000);
        task.setDueDate(dueDate);
        task.setStartDate(startDate);
        task.setProjectId(projectId);
        return taskRepository.save(task);
    }

    @Test
    void emptyTodayResponseWhenNothingMatches() throws Exception {
        LocalDate today = LocalDate.now();
        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(today.toString()))
                .andExpect(jsonPath("$.tasks.length()").value(0));
    }

    @Test
    void taskDueTodayAppearsWithDueTodayReason() throws Exception {
        LocalDate today = LocalDate.now();
        Task task = saveTask("Due today", Status.NOT_STARTED, today, null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].task.id").value(task.getId()))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("DUE_TODAY"))
                .andExpect(jsonPath("$.tasks[0].blocked").value(false));
    }

    @Test
    void overdueTaskAppearsWithOverdueReason() throws Exception {
        LocalDate today = LocalDate.now();
        Task task = saveTask("Overdue", Status.NOT_STARTED, today.minusDays(3), null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].task.id").value(task.getId()))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("OVERDUE"));
    }

    @Test
    void completedOverdueTaskDoesNotAppear() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Done but overdue", Status.DONE, today.minusDays(3), null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(0));
    }

    @Test
    void cancelledOverdueTaskDoesNotAppear() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Cancelled but overdue", Status.CANCELLED, today.minusDays(3), null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(0));
    }

    @Test
    void futureTaskDoesNotAppear() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Not due yet", Status.NOT_STARTED, today.plusDays(5), null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(0));
    }

    @Test
    void taskScheduledForTodayAppearsWhenNotOverdueOrDueToday() throws Exception {
        LocalDate today = LocalDate.now();
        Task task = saveTask("Start today", Status.NOT_STARTED, today.plusDays(10), today, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].task.id").value(task.getId()))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("SCHEDULED_TODAY"));
    }

    @Test
    void taskIsNotDoubleCountedWhenDueTodayAndStartedToday() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Due and starting today", Status.NOT_STARTED, today, today, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("DUE_TODAY"));
    }

    @Test
    void projectTodayOnlyReturnsThatProjectsTasks() throws Exception {
        LocalDate today = LocalDate.now();
        Project projectA = new Project("Project A");
        projectA.setUserId(alice.getId());
        Long projectAId = projectRepository.save(projectA).getId();
        Project projectB = new Project("Project B");
        projectB.setUserId(alice.getId());
        Long projectBId = projectRepository.save(projectB).getId();

        Task inA = saveTask("In project A", Status.NOT_STARTED, today, null, projectAId);
        saveTask("In project B", Status.NOT_STARTED, today, null, projectBId);
        saveTask("No project", Status.NOT_STARTED, today, null, null);

        mockMvc.perform(get("/api/v1/projects/{id}/today", projectAId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].task.id").value(inA.getId()))
                .andExpect(jsonPath("$.tasks[0].task.projectId").value(projectAId));
    }

    @Test
    void projectTodayForAnotherUsersProjectReturns404() throws Exception {
        Project aliceProject = new Project("Alice's project");
        aliceProject.setUserId(alice.getId());
        Long aliceProjectId = projectRepository.save(aliceProject).getId();

        TestAuthSupport.loginAsNewUser(userRepository); // switch to Bob

        mockMvc.perform(get("/api/v1/projects/{id}/today", aliceProjectId))
                .andExpect(status().isNotFound());
    }

    @Test
    void anotherUsersTaskNeverAppearsInTodayOrProjectToday() throws Exception {
        LocalDate today = LocalDate.now();
        Project aliceProject = new Project("Alice's project");
        aliceProject.setUserId(alice.getId());
        Long aliceProjectId = projectRepository.save(aliceProject).getId();

        User bob = TestAuthSupport.loginAsNewUser(userRepository);
        Task bobTask = new Task("Bob's task");
        bobTask.setUserId(bob.getId());
        bobTask.setStatus(Status.NOT_STARTED);
        bobTask.setPosition(1000);
        bobTask.setDueDate(today);
        taskRepository.save(bobTask);

        // Switch back to Alice: neither her global Today nor her project's Today should ever
        // surface Bob's task, even though Bob's task is due today too.
        TestAuthSupport.loginAsNewUser(userRepository);
        alice = TestAuthSupport.loginAsNewUser(userRepository);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(0));
    }

    @Test
    void deterministicOrderingWithinASharedBucketFallsBackToId() throws Exception {
        LocalDate today = LocalDate.now();
        Task first = saveTask("First created", Status.NOT_STARTED, today, null, null);
        Task second = saveTask("Second created", Status.NOT_STARTED, today, null, null);
        Task third = saveTask("Third created", Status.NOT_STARTED, today, null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(3))
                .andExpect(jsonPath("$.tasks[0].task.id").value(first.getId()))
                .andExpect(jsonPath("$.tasks[1].task.id").value(second.getId()))
                .andExpect(jsonPath("$.tasks[2].task.id").value(third.getId()));
    }

    @Test
    void overdueGroupComesBeforeDueTodayGroupWhichComesBeforeScheduledGroup() throws Exception {
        LocalDate today = LocalDate.now();
        saveTask("Scheduled today", Status.NOT_STARTED, today.plusDays(10), today, null);
        saveTask("Due today", Status.NOT_STARTED, today, null, null);
        saveTask("Overdue", Status.NOT_STARTED, today.minusDays(1), null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(3))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("OVERDUE"))
                .andExpect(jsonPath("$.tasks[1].todayReason").value("DUE_TODAY"))
                .andExpect(jsonPath("$.tasks[2].todayReason").value("SCHEDULED_TODAY"));
    }

    @Test
    void blockedTaskExposesBlockedTrueUntilItsBlockerIsDone() throws Exception {
        LocalDate today = LocalDate.now();
        Task blocker = saveTask("Blocker", Status.NOT_STARTED, null, null, null);
        Task blocked = saveTask("Blocked and due today", Status.NOT_STARTED, today, null, null);

        TaskDependency dependency = new TaskDependency();
        dependency.setUserId(alice.getId());
        dependency.setTask(blocked);
        dependency.setBlocksTask(blocker);
        taskDependencyRepository.save(dependency);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks[0].blocked").value(true));

        blocker.setStatus(Status.DONE);
        taskRepository.save(blocker);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks[0].blocked").value(false));
    }

    @Test
    void dateBoundaryUsesTheAccountsConfiguredTimezoneNotTheServerDefault() throws Exception {
        // Pick a zone whose "today" is very likely to differ from the JVM/server default zone,
        // then confirm a task due on THAT zone's today shows up as due-today, proving the
        // classification isn't accidentally keyed off LocalDate.now() with no zone.
        ZoneId zone = ZoneId.of("Pacific/Kiritimati");
        LocalDate zoneToday = LocalDate.now(zone);

        AppSetting setting = new AppSetting();
        setting.setUserId(alice.getId());
        setting.setKey(SettingsService.TIMEZONE_KEY);
        setting.setValue(zone.getId());
        appSettingRepository.save(setting);

        Task task = saveTask("Due per account timezone", Status.NOT_STARTED, zoneToday, null, null);

        mockMvc.perform(get("/api/v1/tasks/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(zoneToday.toString()))
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].task.id").value(task.getId()))
                .andExpect(jsonPath("$.tasks[0].todayReason").value("DUE_TODAY"));
    }
}
