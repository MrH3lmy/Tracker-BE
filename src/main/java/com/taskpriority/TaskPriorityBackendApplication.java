package com.taskpriority;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TaskPriorityBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskPriorityBackendApplication.class, args);
    }
}
