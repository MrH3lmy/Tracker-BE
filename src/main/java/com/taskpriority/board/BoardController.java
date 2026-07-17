package com.taskpriority.board;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.repository.BoardColumnRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/board-columns")
public class BoardController {
    private final BoardColumnRepository boardColumnRepository;
    private final CurrentUserService currentUserService;

    public BoardController(BoardColumnRepository boardColumnRepository, CurrentUserService currentUserService) {
        this.boardColumnRepository = boardColumnRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<BoardColumnResponse> columns() {
        Long userId = currentUserService.requireUserId();
        return boardColumnRepository.findAllByUserIdOrderByPositionAsc(userId).stream()
                .map(c -> new BoardColumnResponse(c.getId(), c.getName(), c.getStatus(), c.getPosition()))
                .toList();
    }
}
