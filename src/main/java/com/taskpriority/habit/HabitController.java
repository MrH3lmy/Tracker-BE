package com.taskpriority.habit;

import com.taskpriority.model.Habit;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/habits")
public class HabitController {
    private final HabitService habitService;
    private final HabitApiMapper mapper;

    public HabitController(HabitService habitService, HabitApiMapper mapper) {
        this.habitService = habitService;
        this.mapper = mapper;
    }

    @GetMapping
    public List<HabitResponse> all() {
        return habitService.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public HabitResponse byId(@PathVariable Long id) {
        return mapper.toResponse(habitService.findById(id));
    }

    @PostMapping
    public ResponseEntity<HabitResponse> create(@Validated @RequestBody CreateHabitRequest request) {
        Habit saved = habitService.save(mapper.fromCreateRequest(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    public HabitResponse update(@PathVariable Long id, @Validated @RequestBody UpdateHabitRequest request) {
        Habit existing = habitService.findById(id);
        mapper.applyUpdateRequest(existing, request);
        return mapper.toResponse(habitService.updateHabit(id, existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        habitService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/check-in")
    public HabitResponse checkIn(@PathVariable Long id) {
        return mapper.toResponse(habitService.checkIn(id));
    }

    @DeleteMapping("/{id}/check-in")
    public HabitResponse undoCheckIn(@PathVariable Long id) {
        return mapper.toResponse(habitService.undoCheckIn(id));
    }
}
