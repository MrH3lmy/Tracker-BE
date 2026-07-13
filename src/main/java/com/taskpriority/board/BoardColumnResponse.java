package com.taskpriority.board;

import com.taskpriority.model.Status;

public record BoardColumnResponse(Long id, String name, Status status, int position) {
}
