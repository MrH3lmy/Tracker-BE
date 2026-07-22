package com.taskpriority.board;

import com.taskpriority.model.Board;
import com.taskpriority.model.BoardColumn;
import com.taskpriority.model.Status;
import com.taskpriority.repository.BoardColumnRepository;
import com.taskpriority.repository.BoardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BoardProvisioningServiceTest {
    private static final Long USER_ID = 42L;

    private BoardRepository boardRepository;
    private BoardColumnRepository boardColumnRepository;
    private BoardProvisioningService service;

    @BeforeEach
    void setUp() {
        boardRepository = mock(BoardRepository.class);
        boardColumnRepository = mock(BoardColumnRepository.class);
        service = new BoardProvisioningService(boardRepository, boardColumnRepository);

        when(boardRepository.save(any(Board.class))).thenAnswer(invocation -> {
            Board board = invocation.getArgument(0);
            board.setId(1L);
            return board;
        });
        when(boardColumnRepository.save(any(BoardColumn.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsOneBoardAndSevenColumnsCoveringEveryStatus() {
        when(boardRepository.existsByUserId(USER_ID)).thenReturn(false);

        service.provisionDefaultBoardForUser(USER_ID);

        verify(boardRepository, times(1)).save(any(Board.class));
        verify(boardColumnRepository, times(7)).save(any(BoardColumn.class));

        var captor = org.mockito.ArgumentCaptor.forClass(BoardColumn.class);
        verify(boardColumnRepository, times(7)).save(captor.capture());
        List<BoardColumn> columns = captor.getAllValues();

        Set<Status> statuses = columns.stream().map(BoardColumn::getStatus).collect(Collectors.toSet());
        assertEquals(Set.of(Status.values()), statuses);
        columns.forEach(column -> {
            assertEquals(USER_ID, column.getUserId());
            assertEquals(1L, column.getBoard().getId());
        });
    }

    @Test
    void isIdempotentWhenTheUserAlreadyHasABoard() {
        when(boardRepository.existsByUserId(USER_ID)).thenReturn(true);

        service.provisionDefaultBoardForUser(USER_ID);

        verify(boardRepository, never()).save(any(Board.class));
        verify(boardColumnRepository, never()).save(any(BoardColumn.class));
    }
}
