package com.taskpriority.habit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HabitController.class)
class HabitControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HabitService habitService;

    @MockBean
    private HabitApiMapper mapper;

    @Test
    void createReturnsBadRequestWhenTitleMissing() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("is required")));
    }

    @Test
    void createReturnsBadRequestWhenRecurrenceMissing() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("recurrence is required")));
    }

    @Test
    void createReturnsBadRequestWhenFrequencyIsNone() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"NONE","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("must not be NONE")));
    }

    @Test
    void historyReturnsDailyCountsForRange() throws Exception {
        com.taskpriority.repository.HabitCheckInRepository.HabitCheckInDailyCount row =
                org.mockito.Mockito.mock(com.taskpriority.repository.HabitCheckInRepository.HabitCheckInDailyCount.class);
        when(row.getHabitId()).thenReturn(1L);
        when(row.getCheckInDate()).thenReturn(LocalDate.of(2026, 7, 13));
        when(row.getCheckInCount()).thenReturn(5L);
        when(habitService.history(any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(row));

        mockMvc.perform(get("/api/v1/habits/history")
                        .param("from", "2026-07-13")
                        .param("to", "2026-07-19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].habitId").value(1))
                .andExpect(jsonPath("$[0].date").value("2026-07-13"))
                .andExpect(jsonPath("$[0].count").value(5));
    }
}
