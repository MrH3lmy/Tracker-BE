package com.taskpriority.habit;

import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Area;
import com.taskpriority.model.Habit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    private HabitResponse sampleResponse(long id) {
        return new HabitResponse(id, "Drink water", "8 glasses", Area.HEALTH, false,
                null, 8, false, null, LocalDateTime.now(), 0, false, null);
    }

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
    void getAllReturnsMappedHabits() throws Exception {
        Habit habit = new Habit("Drink water");
        habit.setId(1L);
        when(habitService.findAll()).thenReturn(List.of(habit));
        when(mapper.toResponse(habit)).thenReturn(sampleResponse(1L));

        mockMvc.perform(get("/api/v1/habits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Drink water"));
    }

    @Test
    void getByIdReturnsMappedHabit() throws Exception {
        Habit habit = new Habit("Drink water");
        habit.setId(7L);
        when(habitService.findById(7L)).thenReturn(habit);
        when(mapper.toResponse(habit)).thenReturn(sampleResponse(7L));

        mockMvc.perform(get("/api/v1/habits/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void getByIdReturnsNotFoundWhenHabitMissing() throws Exception {
        when(habitService.findById(404L)).thenThrow(new ResourceNotFoundException("Habit with id 404 not found"));

        mockMvc.perform(get("/api/v1/habits/404"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createReturnsCreatedForFullyValidRequest() throws Exception {
        Habit mapped = new Habit("Drink water");
        Habit saved = new Habit("Drink water");
        saved.setId(1L);
        when(mapper.fromCreateRequest(any(CreateHabitRequest.class))).thenReturn(mapped);
        when(habitService.save(mapped)).thenReturn(saved);
        when(mapper.toResponse(saved)).thenReturn(sampleResponse(1L));

        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","description":"8 glasses","area":"HEALTH","important":true,
                                 "estimatedMinutes":5,"dailyTargetCount":8,
                                 "reminderEnabled":true,"reminderTime":"09:30:00",
                                 "recurrence":{"frequency":"WEEKLY","interval":1,"daysOfWeek":["MONDAY","WEDNESDAY","FRIDAY"]}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void createReturnsBadRequestWhenIntervalNotPositive() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"DAILY","interval":0}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("interval must be greater than 0")));
    }

    @Test
    void createReturnsBadRequestWhenWeeklyMissingDays() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"WEEKLY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("daysOfWeek is required")));
    }

    @Test
    void createReturnsBadRequestWhenWeeklyDaysEmpty() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"WEEKLY","interval":1,"daysOfWeek":[]}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("daysOfWeek is required")));
    }

    @Test
    void createReturnsBadRequestWhenMonthlyMissingDayOfMonth() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"MONTHLY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("dayOfMonth must be between 1 and 31")));
    }

    @Test
    void createReturnsBadRequestWhenMonthlyDayOfMonthTooLow() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"MONTHLY","interval":1,"dayOfMonth":0}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("dayOfMonth must be between 1 and 31")));
    }

    @Test
    void createReturnsBadRequestWhenMonthlyDayOfMonthTooHigh() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"MONTHLY","interval":1,"dayOfMonth":40}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("dayOfMonth must be between 1 and 31")));
    }

    @Test
    void createReturnsCreatedForValidMonthlyRequest() throws Exception {
        Habit mapped = new Habit("Monthly habit");
        Habit saved = new Habit("Monthly habit");
        saved.setId(2L);
        when(mapper.fromCreateRequest(any(CreateHabitRequest.class))).thenReturn(mapped);
        when(habitService.save(mapped)).thenReturn(saved);
        when(mapper.toResponse(saved)).thenReturn(sampleResponse(2L));

        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Monthly habit","recurrence":{"frequency":"MONTHLY","interval":1,"dayOfMonth":15}}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void createReturnsBadRequestWhenYearlyMissingAnnualDate() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","recurrence":{"frequency":"YEARLY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("annualDate is required")));
    }

    @Test
    void createReturnsCreatedForValidYearlyRequest() throws Exception {
        Habit mapped = new Habit("Yearly habit");
        Habit saved = new Habit("Yearly habit");
        saved.setId(3L);
        when(mapper.fromCreateRequest(any(CreateHabitRequest.class))).thenReturn(mapped);
        when(habitService.save(mapped)).thenReturn(saved);
        when(mapper.toResponse(saved)).thenReturn(sampleResponse(3L));

        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Yearly habit","recurrence":{"frequency":"YEARLY","interval":1,"annualDate":"--07-04"}}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void createReturnsBadRequestWhenReminderEnabledWithoutTime() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","reminderEnabled":true,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("reminderTime is required")));
    }

    @Test
    void createReturnsBadRequestWhenDailyTargetCountNotPositive() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","dailyTargetCount":0,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("dailyTargetCount must be greater than 0")));
    }

    @Test
    void createReturnsBadRequestWhenEstimatedMinutesNegative() throws Exception {
        mockMvc.perform(post("/api/v1/habits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","estimatedMinutes":-5,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("estimatedMinutes must be greater than or equal to 0")));
    }

    @Test
    void updateReturnsOkForFullyValidRequest() throws Exception {
        Habit existing = new Habit("Drink water");
        existing.setId(1L);
        Habit updated = new Habit("Drink water");
        updated.setId(1L);
        when(habitService.findById(1L)).thenReturn(existing);
        when(habitService.updateHabit(eq(1L), any(Habit.class))).thenReturn(updated);
        when(mapper.toResponse(updated)).thenReturn(sampleResponse(1L));

        mockMvc.perform(put("/api/v1/habits/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","important":false,
                                 "reminderEnabled":true,"reminderTime":"09:30:00",
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        verify(mapper).applyUpdateRequest(eq(existing), any(UpdateHabitRequest.class));
    }

    @Test
    void updateReturnsBadRequestWhenReminderEnabledWithoutTime() throws Exception {
        mockMvc.perform(put("/api/v1/habits/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","important":false,"reminderEnabled":true,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("reminderTime is required")));
    }

    @Test
    void updateReturnsNotFoundWhenHabitMissing() throws Exception {
        when(habitService.findById(404L)).thenThrow(new ResourceNotFoundException("Habit with id 404 not found"));

        mockMvc.perform(put("/api/v1/habits/404")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Drink water","important":false,
                                 "recurrence":{"frequency":"DAILY","interval":1}}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/habits/1"))
                .andExpect(status().isNoContent());

        verify(habitService).delete(1L);
    }

    @Test
    void checkInReturnsOkWithMappedHabit() throws Exception {
        Habit habit = new Habit("Drink water");
        habit.setId(1L);
        when(habitService.checkIn(1L)).thenReturn(habit);
        when(mapper.toResponse(habit)).thenReturn(sampleResponse(1L));

        mockMvc.perform(patch("/api/v1/habits/1/check-in"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void undoCheckInReturnsOkWithMappedHabit() throws Exception {
        Habit habit = new Habit("Drink water");
        habit.setId(1L);
        when(habitService.undoCheckIn(1L)).thenReturn(habit);
        when(mapper.toResponse(habit)).thenReturn(sampleResponse(1L));

        mockMvc.perform(delete("/api/v1/habits/1/check-in"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
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
