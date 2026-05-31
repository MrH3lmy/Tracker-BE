package com.taskpriority.settings;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {
    private final SettingsService settingsService;
    public SettingsController(SettingsService settingsService){this.settingsService=settingsService;}
    @GetMapping public Map<String,Object> get(){ return settingsService.getAll(); }
    @PutMapping public Map<String,Object> update(@RequestBody Map<String,Object> updates){ return settingsService.update(updates); }
}
