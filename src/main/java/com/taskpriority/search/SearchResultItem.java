package com.taskpriority.search;

public record SearchResultItem(
        String type,
        Long id,
        String title,
        String snippet,
        String url
) {
}
