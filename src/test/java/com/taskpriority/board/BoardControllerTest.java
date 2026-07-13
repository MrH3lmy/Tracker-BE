package com.taskpriority.board;

import com.taskpriority.model.BoardColumn;
import com.taskpriority.model.Status;
import com.taskpriority.repository.BoardColumnRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BoardController.class)
class BoardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BoardColumnRepository boardColumnRepository;

    private BoardColumn column(long id, String name, Status status, int position) {
        BoardColumn column = new BoardColumn();
        column.setId(id);
        column.setName(name);
        column.setStatus(status);
        column.setPosition(position);
        return column;
    }

    @Test
    void returnsColumnsInPositionOrder() throws Exception {
        when(boardColumnRepository.findAllByOrderByPositionAsc()).thenReturn(List.of(
                column(1L, "Backlog", Status.BACKLOG, 1000),
                column(2L, "Not Started", Status.NOT_STARTED, 2000),
                column(3L, "In Progress", Status.IN_PROGRESS, 3000),
                column(4L, "Waiting", Status.WAITING, 4000),
                column(5L, "Blocked", Status.BLOCKED, 5000),
                column(6L, "Done", Status.DONE, 6000),
                column(7L, "Cancelled", Status.CANCELLED, 7000)
        ));

        mockMvc.perform(get("/api/v1/board-columns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$[0].name").value("Backlog"))
                .andExpect(jsonPath("$[0].status").value("BACKLOG"))
                .andExpect(jsonPath("$[0].position").value(1000))
                .andExpect(jsonPath("$[6].name").value("Cancelled"));
    }
}
