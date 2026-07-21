package com.taskpriority.focus;

import com.taskpriority.model.FocusSession;
import com.taskpriority.model.FocusSessionStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FocusSessionController.class)
@AutoConfigureMockMvc(addFilters = false)
class FocusSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FocusSessionService focusSessionService;

    @MockBean
    private FocusSessionApiMapper mapper;

    private FocusSession session(Long id, FocusSessionStatus status) {
        FocusSession session = new FocusSession();
        session.setId(id);
        session.setUserId(1L);
        session.setStatus(status);
        session.setStartedAt(LocalDateTime.now().minusMinutes(10));
        return session;
    }

    @Test
    void startReturnsCreated() throws Exception {
        FocusSession session = session(1L, FocusSessionStatus.RUNNING);
        when(focusSessionService.start(any(StartFocusSessionRequest.class))).thenReturn(session);
        when(mapper.toResponse(any(), any(), anyInt())).thenReturn(new FocusSessionResponse(1L, null, null, session.getStartedAt(), null, FocusSessionStatus.RUNNING, null, null, 10));

        mockMvc.perform(post("/api/v1/focus-sessions")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("RUNNING"));
    }

    @Test
    void activeReturnsNoContentWhenNoSessionRunning() throws Exception {
        when(focusSessionService.findActive()).thenReturn(null);

        mockMvc.perform(get("/api/v1/focus-sessions/active"))
                .andExpect(status().isNoContent());
    }

    @Test
    void activeReturnsTheRunningSession() throws Exception {
        FocusSession session = session(1L, FocusSessionStatus.RUNNING);
        when(focusSessionService.findActive()).thenReturn(session);
        when(mapper.toResponse(any(), any(), anyInt())).thenReturn(new FocusSessionResponse(1L, null, null, session.getStartedAt(), null, FocusSessionStatus.RUNNING, null, null, 10));

        mockMvc.perform(get("/api/v1/focus-sessions/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void pausingAnInvalidTransitionReturnsBadRequest() throws Exception {
        when(focusSessionService.pause(1L)).thenThrow(new IllegalArgumentException("Only a running focus session can be paused."));

        mockMvc.perform(patch("/api/v1/focus-sessions/1/pause"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void stopReturnsOkWithComputedMinutes() throws Exception {
        FocusSession session = session(1L, FocusSessionStatus.COMPLETED);
        session.setActualMinutes(10);
        when(focusSessionService.stop(org.mockito.ArgumentMatchers.eq(1L), any())).thenReturn(session);
        when(mapper.toResponse(any(), any(), anyInt())).thenReturn(new FocusSessionResponse(1L, null, null, session.getStartedAt(), LocalDateTime.now(), FocusSessionStatus.COMPLETED, null, 10, 10));

        mockMvc.perform(patch("/api/v1/focus-sessions/1/stop")
                        .contentType("application/json")
                        .content("{\"completeTask\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actualMinutes").value(10));
    }

    @Test
    void analyticsReturnsAggregatedResponse() throws Exception {
        FocusAnalyticsResponse response = new FocusAnalyticsResponse(120, 2, Map.of("2026-01-05", 120), Map.of("WORK", 120), List.of(), 9);
        when(focusSessionService.getAnalytics(any(), any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/focus-sessions/analytics?from=2026-01-01&to=2026-01-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMinutes").value(120))
                .andExpect(jsonPath("$.mostProductiveHour").value(9));
    }
}
