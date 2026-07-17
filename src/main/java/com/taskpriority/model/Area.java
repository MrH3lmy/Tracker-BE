package com.taskpriority.model;

import java.util.EnumSet;
import java.util.Set;

public enum Area {
    WORK,
    STUDY,
    PERSONAL,
    HEALTH,
    FAMILY;

    public static final Set<Area> WORK_AREAS = EnumSet.of(WORK, STUDY);
}
