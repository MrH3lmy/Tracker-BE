package com.taskpriority.settings;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
@Tag(name = "Settings", description = "Application-wide key/value settings")
public class SettingsController {
    private final SettingsService settingsService;
    public SettingsController(SettingsService settingsService){this.settingsService=settingsService;}

    @Operation(summary = "Get all settings")
    @ApiResponse(responseCode = "200", description = "Current settings as a key/value map", content = @Content(schema = @Schema(type = "object")))
    @GetMapping public Map<String,Object> get(){ return settingsService.getAll(); }

    @Operation(summary = "Update settings", description = "Merges the given key/value pairs into the existing settings and returns the full resulting settings map.")
    @ApiResponse(responseCode = "200", description = "Updated settings as a key/value map", content = @Content(schema = @Schema(type = "object")))
    @PutMapping public Map<String,Object> update(@RequestBody Map<String,Object> updates){ return settingsService.update(updates); }
}
