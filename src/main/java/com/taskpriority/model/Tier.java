package com.taskpriority.model;

public enum Tier {
    FREE(0),
    PREMIUM(1);

    private final int rank;

    Tier(int rank) {
        this.rank = rank;
    }

    public int rank() {
        return rank;
    }
}
