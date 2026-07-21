package com.taskpriority.board;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.repository.BoardColumnRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/board-columns")
@Tag(name = "Board Columns", description = "Task board column layout for the current user")
public class BoardController {
    private final BoardColumnRepository boardColumnRepository;
    private final CurrentUserService currentUserService;

    public BoardController(BoardColumnRepository boardColumnRepository, CurrentUserService currentUserService) {
        this.boardColumnRepository = boardColumnRepository;
        this.currentUserService = currentUserService;
    }

    @Operation(summary = "List the current user's board columns", description = "Ordered by column position.")
    @GetMapping
    public List<BoardColumnResponse> columns() {
        Long userId = currentUserService.requireUserId();
        return boardColumnRepository.findAllByUserIdOrderByPositionAsc(userId).stream()
                .map(c -> new BoardColumnResponse(c.getId(), c.getName(), c.getStatus(), c.getPosition()))
                .toList();
    }
}
