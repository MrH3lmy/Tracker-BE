package com.taskpriority.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_dependencies", uniqueConstraints = {
        @UniqueConstraint(name = "uk_task_dependencies_pair", columnNames = {"task_id", "blocks_task_id"})
}, indexes = {
        @Index(name = "idx_task_dependencies_task_id", columnList = "task_id"),
        @Index(name = "idx_task_dependencies_blocks_task_id", columnList = "blocks_task_id")
})
public class TaskDependency {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "blocks_task_id", nullable = false)
    private Task blocksTask;

    @Enumerated(EnumType.STRING)
    @Column(name = "dependency_type", nullable = false)
    private TaskDependencyType dependencyType = TaskDependencyType.BLOCKS;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public Task getBlocksTask() { return blocksTask; }
    public void setBlocksTask(Task blocksTask) { this.blocksTask = blocksTask; }
    public TaskDependencyType getDependencyType() { return dependencyType; }
    public void setDependencyType(TaskDependencyType dependencyType) { this.dependencyType = dependencyType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
