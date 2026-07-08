package com.taskpriority.repository;

import com.taskpriority.model.Note;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.From;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class NoteRepositoryImpl implements NoteRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<Long> findIds(Specification<Note> specification, Pageable pageable) {
        CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> criteriaQuery = criteriaBuilder.createQuery(Long.class);
        Root<Note> root = criteriaQuery.from(Note.class);

        criteriaQuery.select(root.get("id"));
        if (specification != null) {
            Predicate predicate = specification.toPredicate(root, criteriaQuery, criteriaBuilder);
            if (predicate != null) {
                criteriaQuery.where(predicate);
            }
        }
        // The ID page query must not fetch or de-duplicate collection joins; tag filters use subqueries.
        criteriaQuery.distinct(false);

        Sort sort = pageable == null ? Sort.unsorted() : pageable.getSort();
        if (sort.isSorted()) {
            criteriaQuery.orderBy(toOrders(sort, root, criteriaBuilder));
        }

        TypedQuery<Long> query = entityManager.createQuery(criteriaQuery);
        if (pageable != null && pageable.isPaged()) {
            query.setFirstResult((int) pageable.getOffset());
            query.setMaxResults(pageable.getPageSize());
        }
        return query.getResultList();
    }

    private List<Order> toOrders(Sort sort, Root<Note> root, CriteriaBuilder criteriaBuilder) {
        List<Order> orders = new ArrayList<>();
        for (Sort.Order sortOrder : sort) {
            Path<?> path = resolvePath(root, sortOrder.getProperty());
            orders.add(sortOrder.isAscending() ? criteriaBuilder.asc(path) : criteriaBuilder.desc(path));
        }
        return orders;
    }

    private Path<?> resolvePath(Root<Note> root, String property) {
        if (!property.contains(".")) {
            return root.get(property);
        }

        String[] parts = property.split("\\.");
        From<?, ?> from = root;
        for (int i = 0; i < parts.length - 1; i++) {
            from = from.join(parts[i], jakarta.persistence.criteria.JoinType.LEFT);
        }
        return from.get(parts[parts.length - 1]);
    }
}
