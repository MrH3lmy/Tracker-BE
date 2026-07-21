package com.taskpriority.board;

import com.taskpriority.model.Board;
import com.taskpriority.model.BoardColumn;
import com.taskpriority.model.Status;
import com.taskpriority.model.User;
import com.taskpriority.repository.BoardColumnRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real @SpringBootTest coverage for BoardController against H2. BoardController is a read-only
 * endpoint with no create/update/delete/validation surface of its own; board_columns are normally
 * seeded per-user by a Flyway migration (V2/V28/V29) which is disabled under the local-test
 * profile, so this test persists BoardColumn rows directly via BoardColumnRepository (plus a
 * Board parent row via EntityManager, since there is no BoardRepository) to exercise the real
 * repository query the controller relies on.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@Transactional
class BoardControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired BoardColumnRepository boardColumnRepository;

    @PersistenceContext
    EntityManager entityManager;

    private Long userId;

    @BeforeEach
    void setUp() {
        User user = TestAuthSupport.loginAsNewUser(userRepository);
        userId = user.getId();
    }

    private Board persistBoard(Long ownerUserId) {
        Board board = new Board();
        board.setUserId(ownerUserId);
        board.setName("Default Board");
        entityManager.persist(board);
        return board;
    }

    private BoardColumn persistColumn(Long ownerUserId, Board board, String name, Status status, int position) {
        BoardColumn column = new BoardColumn();
        column.setUserId(ownerUserId);
        column.setBoard(board);
        column.setName(name);
        column.setStatus(status);
        column.setPosition(position);
        return boardColumnRepository.save(column);
    }

    @Test
    void columnsReturnsRealPersistedColumnsInPositionOrder() throws Exception {
        Board board = persistBoard(userId);
        persistColumn(userId, board, "In Progress", Status.IN_PROGRESS, 3000);
        persistColumn(userId, board, "Backlog", Status.BACKLOG, 1000);
        persistColumn(userId, board, "Done", Status.DONE, 6000);

        mockMvc.perform(get("/api/v1/board-columns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("Backlog"))
                .andExpect(jsonPath("$[0].status").value("BACKLOG"))
                .andExpect(jsonPath("$[0].position").value(1000))
                .andExpect(jsonPath("$[1].name").value("In Progress"))
                .andExpect(jsonPath("$[2].name").value("Done"));
    }

    @Test
    void columnsReturnsEmptyListWhenUserHasNoColumns() throws Exception {
        mockMvc.perform(get("/api/v1/board-columns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void columnsAreIsolatedPerUser() throws Exception {
        User otherUser = new User();
        otherUser.setEmail("other-board-user-" + System.nanoTime() + "@example.com");
        otherUser.setPasswordHash("irrelevant");
        otherUser.setTier(com.taskpriority.model.Tier.FREE);
        otherUser.setRole(com.taskpriority.model.Role.USER);
        otherUser = userRepository.save(otherUser);

        Board otherBoard = persistBoard(otherUser.getId());
        persistColumn(otherUser.getId(), otherBoard, "Someone Else's Column", Status.BACKLOG, 1000);

        Board myBoard = persistBoard(userId);
        persistColumn(userId, myBoard, "My Column", Status.BACKLOG, 1000);

        mockMvc.perform(get("/api/v1/board-columns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("My Column"));
    }
}
