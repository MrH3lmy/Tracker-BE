-- Tag and NoteTemplate names were globally unique (single-tenant assumption). Rescope both
-- to be unique per user: tags are personal categorization, and note templates are kept
-- per-user for consistency (a shared template library is deliberately deferred future work).
ALTER TABLE tags DROP CONSTRAINT uk_tags_name;
ALTER TABLE tags ADD CONSTRAINT uk_tags_user_name UNIQUE (user_id, name);

ALTER TABLE note_templates DROP CONSTRAINT note_templates_name_key;
ALTER TABLE note_templates ADD CONSTRAINT uk_note_templates_user_name UNIQUE (user_id, name);
