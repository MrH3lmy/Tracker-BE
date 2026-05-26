package com.taskpriority.task.api;

import com.taskpriority.task.application.ImportService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/import")
public class ImportController {
    private final ImportService importService;
    public ImportController(ImportService importService){this.importService=importService;}
    @PostMapping("/csv") public int importCsv(@RequestBody String csv){ return importService.importCsv(csv).size(); }
    @PostMapping("/tasks") public ImportService.ImportResult importTasks(@RequestBody String csv){ return importService.importTasksCsv(csv); }
}
