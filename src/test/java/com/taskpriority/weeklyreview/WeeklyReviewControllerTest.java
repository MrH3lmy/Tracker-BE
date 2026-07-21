package com.taskpriority.weeklyreview;

import com.taskpriority.model.WeeklyReview;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WeeklyReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
class WeeklyReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WeeklyReviewService weeklyReviewService;

    @MockBean
    private WeeklyReviewApiMapper mapper;

    @Test
    void currentDraftReturnsComputedContent() throws Exception {
        WeeklyReviewDraftResponse draft = new WeeklyReviewDraftResponse(
                LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 11),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
        when(weeklyReviewService.getCurrentDraft()).thenReturn(draft);

        mockMvc.perform(get("/api/v1/weekly-reviews/current-draft"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekStartDate").value("2026-01-05"));
    }

    @Test
    void completeReturnsCreated() throws Exception {
        WeeklyReview review = new WeeklyReview();
        review.setId(1L);
        review.setWeekStartDate(LocalDate.of(2026, 1, 5));
        review.setCompletedAt(LocalDateTime.now());
        when(weeklyReviewService.completeReview(any(CompleteWeeklyReviewRequest.class))).thenReturn(review);
        when(mapper.toResponse(review)).thenReturn(new WeeklyReviewResponse(1L, LocalDate.of(2026, 1, 5), LocalDateTime.now(), "summary", null, LocalDateTime.now()));

        mockMvc.perform(post("/api/v1/weekly-reviews")
                        .contentType("application/json")
                        .content("{\"weekStartDate\":\"2026-01-05\",\"summary\":\"summary\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void completeRejectsMissingWeekStartDate() throws Exception {
        mockMvc.perform(post("/api/v1/weekly-reviews")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void allReturnsListForTheCurrentUser() throws Exception {
        when(weeklyReviewService.findAll(anyInt())).thenReturn(List.of(new WeeklyReview()));
        when(mapper.toResponse(any(WeeklyReview.class))).thenReturn(new WeeklyReviewResponse(1L, LocalDate.now(), LocalDateTime.now(), null, null, LocalDateTime.now()));

        mockMvc.perform(get("/api/v1/weekly-reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }
}
