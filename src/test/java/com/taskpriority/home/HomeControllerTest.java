package com.taskpriority.home;

import com.taskpriority.model.PriorityCategory;
import com.taskpriority.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HomeController.class)
@AutoConfigureMockMvc(addFilters = false)
class HomeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @org.springframework.boot.test.mock.mockito.MockBean
    private HomeService homeService;

    @Test
    void todayReturnsAggregatedResponse() throws Exception {
        TaskService.DashboardSummary summary = new TaskService.DashboardSummary(
                5, 3, 2, 1, 1, 2, 1, 0, 0, 0, 40.0, Map.of(), Map.of(PriorityCategory.DO_NOW, 1L)
        );
        HomeTodayResponse response = new HomeTodayResponse(
                LocalDate.now(), summary, List.of(), List.of(), List.of(), List.of(), 0,
                List.of(), 0, 0, List.of(), List.of(), List.of()
        );
        when(homeService.getToday()).thenReturn(response);

        mockMvc.perform(get("/api/v1/home/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalTasks").value(5))
                .andExpect(jsonPath("$.habitsTotalToday").value(0));
    }
}
