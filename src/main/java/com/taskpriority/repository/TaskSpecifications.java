package com.taskpriority.repository;

import com.taskpriority.model.Area;
import com.taskpriority.model.RiskLevel;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * DB-side filters for the paginated task listing/archive endpoints (issue #260) - mirrors the
 * {@link NoteSpecifications} pattern already used for notes rather than loading a user's full
 * task history and filtering it in Java.
 */
public final class TaskSpecifications {

    private TaskSpecifications() {
    }

    public static Specification<Task> matching(
            Long userId,
            Collection<Status> statuses,
            Long projectId,
            Long boardColumnId,
            Area area,
            RiskLevel riskLevel,
            LocalDate dueDateFrom,
            LocalDate dueDateTo,
            String search
    ) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required to build a Task specification");
        }
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(criteriaBuilder.equal(root.get("userId"), userId));

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }
            if (projectId != null) {
                predicates.add(criteriaBuilder.equal(root.get("projectId"), projectId));
            }
            if (boardColumnId != null) {
                predicates.add(criteriaBuilder.equal(root.get("boardColumnId"), boardColumnId));
            }
            if (area != null) {
                predicates.add(criteriaBuilder.equal(root.get("area"), area));
            }
            if (riskLevel != null) {
                predicates.add(criteriaBuilder.equal(root.get("riskLevel"), riskLevel));
            }
            if (dueDateFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("dueDate"), dueDateFrom));
            }
            if (dueDateTo != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("dueDate"), dueDateTo));
            }
            if (search != null && !search.isBlank()) {
                Expression<String> title = criteriaBuilder.lower(root.get("title"));
                predicates.add(criteriaBuilder.like(title, "%" + search.toLowerCase() + "%"));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
