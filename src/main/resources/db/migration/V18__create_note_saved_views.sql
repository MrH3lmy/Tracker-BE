CREATE TABLE note_saved_views (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    filters_json TEXT NOT NULL DEFAULT '{}',
    sort_field VARCHAR(40) NOT NULL DEFAULT 'updatedAt',
    sort_direction VARCHAR(10) NOT NULL DEFAULT 'desc',
    view_type VARCHAR(40) NOT NULL DEFAULT 'list',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_note_saved_views_name ON note_saved_views (name);
