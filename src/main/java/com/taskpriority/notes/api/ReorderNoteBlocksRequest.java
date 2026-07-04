package com.taskpriority.notes.api;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReorderNoteBlocksRequest(@NotEmpty List<Long> blockIds) {}
