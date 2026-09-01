package com.taskpriority.service;

import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.TaskDependency;
import com.taskpriority.model.User;
import com.taskpriority.repository.TaskDependencyRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Issue #282 requires readiness to be computable for a list of tasks (Today, a project board, the
 * future Project Command Center) without one dependency query per task. This proves it directly
 * against Hibernate's statement counter, isolated to {@link TaskReadinessService} itself (rather
 * than the full {@code TaskService#computeDerivedFieldsBatch}, which also computes unrelated
 * derived fields like priority score): the number of SQL statements
 * {@link TaskReadinessService#computeBatch} issues stays constant as the batch grows, instead of
 * scaling with the number of tasks the way one-lookup-per-task would.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("local-test")
@Transactional
class TaskReadinessBatchQueryIntegrationTest {

    @Autowired TaskReadinessService taskReadinessService;
    @Autowired TaskRepository taskRepository;
    @Autowired TaskDependencyRepository taskDependencyRepository;
    @Autowired UserRepository userRepository;
    @Autowired EntityManagerFactory entityManagerFactory;

    private User alice;

    private Task saveTask(String title, Status status) {
        Task task = new Task(title);
        task.setUserId(alice.getId());
        task.setStatus(status);
        task.setPosition(1000);
        return taskRepository.save(task);
    }

    private void dependOn(Task task, Task blocker) {
        TaskDependency dependency = new TaskDependency();
        dependency.setUserId(alice.getId());
        dependency.setTask(task);
        dependency.setBlocksTask(blocker);
        taskDependencyRepository.save(dependency);
    }

    private List<Task> seedTasksWithOpenBlockers(int count) {
        List<Task> tasks = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Task blocker = saveTask("Blocker " + i, Status.IN_PROGRESS);
            Task task = saveTask("Task " + i, Status.NOT_STARTED);
            dependOn(task, blocker);
            tasks.add(task);
        }
        return tasks;
    }

    private long statementCountFor(List<Task> tasks) {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        Map<Long, TaskReadinessService.Readiness> readiness = taskReadinessService.computeBatch(alice.getId(), tasks);
        // Sanity check alongside the query-count assertion: every seeded task really is blocked.
        assertThat(readiness.values()).allMatch(TaskReadinessService.Readiness::blocked);
        return statistics.getPrepareStatementCount();
    }

    @Test
    void batchQueryCountDoesNotScaleWithNumberOfTasks() {
        alice = TestAuthSupport.loginAsNewUser(userRepository);

        long smallBatchStatements = statementCountFor(seedTasksWithOpenBlockers(3));
        long largeBatchStatements = statementCountFor(seedTasksWithOpenBlockers(30));

        assertThat(largeBatchStatements)
                .as("statement count for a 30-task batch should equal a 3-task batch - one fixed "
                        + "batch query, not one dependency lookup per task")
                .isEqualTo(smallBatchStatements);
        assertThat(smallBatchStatements).as("exactly one query for the whole batch").isEqualTo(1);
    }
}
