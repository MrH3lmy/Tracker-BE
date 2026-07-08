package com.taskpriority.repository;

import com.taskpriority.model.Note;
import com.taskpriority.model.NoteAttachment;
import com.taskpriority.model.NoteContentType;
import com.taskpriority.model.NoteTaskLink;
import com.taskpriority.model.Tag;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class NoteSpecifications {

    private NoteSpecifications() {
    }

    public static Specification<Note> matching(
            Long taskId,
            Long collectionId,
            String query,
            NoteContentType contentType,
            Boolean hasAttachments,
            Boolean linkedTask,
            LocalDateTime createdFrom,
            LocalDateTime createdTo,
            LocalDateTime updatedFrom,
            LocalDateTime updatedTo,
            Boolean untagged,
            List<String> tags,
            String tagMode
    ) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteriaQuery != null) {
                criteriaQuery.distinct(true);
            }

            if (taskId != null) {
                predicates.add(criteriaBuilder.equal(root.get("task").get("id"), taskId));
            }
            if (collectionId != null) {
                predicates.add(criteriaBuilder.equal(root.get("collection").get("id"), collectionId));
            }
            if (contentType != null) {
                predicates.add(criteriaBuilder.equal(root.get("contentType"), contentType));
            }
            if (hasAttachments != null) {
                Predicate attachmentExists = criteriaBuilder.exists(attachmentSubquery(root, criteriaQuery, NoteAttachment.class));
                predicates.add(hasAttachments ? attachmentExists : criteriaBuilder.not(attachmentExists));
            }
            if (linkedTask != null) {
                Predicate taskLinked = criteriaBuilder.isNotNull(root.get("task"));
                Predicate taskLinkExists = criteriaBuilder.exists(attachmentSubquery(root, criteriaQuery, NoteTaskLink.class));
                predicates.add(linkedTask
                        ? criteriaBuilder.or(taskLinked, taskLinkExists)
                        : criteriaBuilder.and(criteriaBuilder.isNull(root.get("task")), criteriaBuilder.not(taskLinkExists)));
            }
            if (createdFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), createdFrom));
            }
            if (createdTo != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), createdTo));
            }
            if (updatedFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("updatedAt"), updatedFrom));
            }
            if (updatedTo != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("updatedAt"), updatedTo));
            }
            if (untagged != null) {
                predicates.add(untagged ? criteriaBuilder.isEmpty(root.get("tags")) : criteriaBuilder.isNotEmpty(root.get("tags")));
            }
            if (query != null) {
                String queryPattern = "%" + query.toLowerCase() + "%";
                Expression<String> title = criteriaBuilder.lower(root.get("title"));
                Expression<String> body = criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("body"), ""));
                predicates.add(criteriaBuilder.or(criteriaBuilder.like(title, queryPattern), criteriaBuilder.like(body, queryPattern)));
            }
            if (tags != null && !tags.isEmpty()) {
                predicates.add(tagsPredicate(root, criteriaQuery, criteriaBuilder, tags, tagMode));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static <T> Subquery<T> attachmentSubquery(Root<Note> root, jakarta.persistence.criteria.CriteriaQuery<?> criteriaQuery, Class<T> subqueryClass) {
        Subquery<T> subquery = criteriaQuery.subquery(subqueryClass);
        Root<T> subqueryRoot = subquery.from(subqueryClass);
        subquery.select(subqueryRoot).where(subqueryRoot.get("note").in(root));
        return subquery;
    }

    private static Predicate tagsPredicate(Root<Note> root,
                                           jakarta.persistence.criteria.CriteriaQuery<?> criteriaQuery,
                                           jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
                                           List<String> tags,
                                           String tagMode) {
        if ("all".equalsIgnoreCase(tagMode)) {
            Subquery<Long> tagCount = criteriaQuery.subquery(Long.class);
            Root<Note> subqueryNote = tagCount.from(Note.class);
            Join<Note, Tag> subqueryTag = subqueryNote.join("tags");
            tagCount.select(criteriaBuilder.countDistinct(subqueryTag.get("name")))
                    .where(criteriaBuilder.and(
                            criteriaBuilder.equal(subqueryNote.get("id"), root.get("id")),
                            subqueryTag.get("name").in(tags)
                    ));
            return criteriaBuilder.equal(tagCount, (long) tags.size());
        }

        Subquery<Long> matchingTag = criteriaQuery.subquery(Long.class);
        Root<Note> subqueryNote = matchingTag.from(Note.class);
        Join<Note, Tag> subqueryTag = subqueryNote.join("tags", JoinType.INNER);
        matchingTag.select(subqueryNote.get("id"))
                .where(criteriaBuilder.and(
                        criteriaBuilder.equal(subqueryNote.get("id"), root.get("id")),
                        subqueryTag.get("name").in(tags)
                ));
        return criteriaBuilder.exists(matchingTag);
    }
}
