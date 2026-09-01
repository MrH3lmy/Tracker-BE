package com.taskpriority.model;

/**
 * Machine-readable note type (issue #287) - lets clients branch on note purpose without inferring
 * it from title/content. Existing rows migrate to GENERAL (see V52).
 */
public enum NoteType {
    GENERAL,
    MEETING,
    RESEARCH,
    TECHNICAL,
    REQUIREMENTS,
    DECISION,
    RETROSPECTIVE
}
