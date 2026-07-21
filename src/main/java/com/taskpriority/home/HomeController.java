package com.taskpriority.home;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/home")
@Tag(name = "Home", description = "Combined home-screen summary")
public class HomeController {
    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @Operation(summary = "Get today's home-screen summary", description = "Aggregates tasks, habits, notifications, and other widgets shown on the home screen.")
    @GetMapping("/today")
    public HomeTodayResponse today() {
        return homeService.getToday();
    }
}
