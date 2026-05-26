package com.example.taskpriority.repository;

import com.example.taskpriority.model.Status;
import com.example.taskpriority.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByStatus(Status status);

    @Query("select t from Task t where t.dueDate <= :date and t.status <> :status")
    List<Task> findOverdueTasks(LocalDate date, Status status);

    List<Task> findByDueDate(LocalDate date);

    List<Task> findByDueDateBetween(LocalDate start, LocalDate end);
}
