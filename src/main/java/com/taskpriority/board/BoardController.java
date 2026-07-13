package com.taskpriority.board;

import com.taskpriority.repository.BoardColumnRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/board-columns")
public class BoardController {
    private final BoardColumnRepository boardColumnRepository;

    public BoardController(BoardColumnRepository boardColumnRepository) {
        this.boardColumnRepository = boardColumnRepository;
    }

    @GetMapping
    public List<BoardColumnResponse> columns() {
        return boardColumnRepository.findAllByOrderByPositionAsc().stream()
                .map(c -> new BoardColumnResponse(c.getId(), c.getName(), c.getStatus(), c.getPosition()))
                .toList();
    }
}
