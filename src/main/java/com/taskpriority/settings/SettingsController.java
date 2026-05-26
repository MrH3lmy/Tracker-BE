package com.taskpriority.settings;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {
    private final SettingsService settingsService;
    public SettingsController(SettingsService settingsService){this.settingsService=settingsService;}
    @GetMapping public Map<String,String> get(){ return settingsService.getAll(); }
    @PutMapping public Map<String,String> update(@RequestBody Map<String,String> updates){ return settingsService.update(updates); }
}
