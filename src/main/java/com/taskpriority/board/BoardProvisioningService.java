package com.taskpriority.board;

import com.taskpriority.model.Board;
import com.taskpriority.model.BoardColumn;
import com.taskpriority.model.Status;
import com.taskpriority.repository.BoardColumnRepository;
import com.taskpriority.repository.BoardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Every user needs their own board/column layout for {@code TaskService.alignBoardColumn} (and
 * {@code BoardController}) to have anything to find - board_columns rows are tenant-scoped (see
 * V43's migration), so without this a new user's tasks would silently end up with a null
 * board_column_id forever.
 */
@Service
public class BoardProvisioningService {

    private record DefaultColumn(String name, Status status, int position) {}

    // Mirrors the layout V2__add_board_columns.sql originally seeded once, globally.
    private static final List<DefaultColumn> DEFAULT_COLUMNS = List.of(
            new DefaultColumn("Backlog", Status.BACKLOG, 1000),
            new DefaultColumn("Not Started", Status.NOT_STARTED, 2000),
            new DefaultColumn("In Progress", Status.IN_PROGRESS, 3000),
            new DefaultColumn("Waiting", Status.WAITING, 4000),
            new DefaultColumn("Blocked", Status.BLOCKED, 5000),
            new DefaultColumn("Done", Status.DONE, 6000),
            new DefaultColumn("Cancelled", Status.CANCELLED, 7000)
    );

    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;

    public BoardProvisioningService(BoardRepository boardRepository, BoardColumnRepository boardColumnRepository) {
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
    }

    /**
     * Idempotent - a user who already has a board (e.g. this being called twice by mistake) is
     * left untouched rather than accumulating duplicate boards.
     */
    @Transactional
    public void provisionDefaultBoardForUser(Long userId) {
        if (boardRepository.existsByUserId(userId)) {
            return;
        }

        Board board = new Board();
        board.setUserId(userId);
        board.setName("Default Board");
        board = boardRepository.save(board);

        for (DefaultColumn defaultColumn : DEFAULT_COLUMNS) {
            BoardColumn column = new BoardColumn();
            column.setUserId(userId);
            column.setBoard(board);
            column.setName(defaultColumn.name());
            column.setStatus(defaultColumn.status());
            column.setPosition(defaultColumn.position());
            boardColumnRepository.save(column);
        }
    }
}
