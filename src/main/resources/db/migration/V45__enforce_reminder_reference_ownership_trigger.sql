-- reminders.reference_id is polymorphic (points at a task for TASK_DUE/FOLLOW_UP, or a habit for
-- HABIT, depending on `kind`), so a single composite FK can't express it - V42 explicitly left it
-- out for this reason. A trigger is the documented option this migration picks: it lets
-- ReminderService keep writing a single reference_id column (see createReminderIfAbsent) instead
-- of being restructured around per-kind nullable columns, while still enforcing ownership at the
-- database level, not just in application code.

-- Fail loudly on any existing cross-user reference before installing the trigger, same policy as
-- V42 step 1.
DO $$
DECLARE
    violation_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO violation_count
    FROM reminders r
    WHERE r.reference_id IS NOT NULL
      AND (
          (r.kind IN ('TASK_DUE', 'FOLLOW_UP') AND NOT EXISTS (
              SELECT 1 FROM tasks t WHERE t.id = r.reference_id AND t.user_id = r.user_id))
          OR
          (r.kind = 'HABIT' AND NOT EXISTS (
              SELECT 1 FROM habits h WHERE h.id = r.reference_id AND h.user_id = r.user_id))
      );
    IF violation_count > 0 THEN
        RAISE EXCEPTION 'Cross-user reference found: % reminder row(s) whose reference_id points to a task/habit owned by a different user. Resolve these manually before re-running this migration - do not weaken this check.', violation_count;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION check_reminder_reference_ownership() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.kind IN ('TASK_DUE', 'FOLLOW_UP') THEN
        IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = NEW.reference_id AND user_id = NEW.user_id) THEN
            RAISE EXCEPTION 'reminders.reference_id % (kind %) does not reference a task owned by user %', NEW.reference_id, NEW.kind, NEW.user_id;
        END IF;
    ELSIF NEW.kind = 'HABIT' THEN
        IF NOT EXISTS (SELECT 1 FROM habits WHERE id = NEW.reference_id AND user_id = NEW.user_id) THEN
            RAISE EXCEPTION 'reminders.reference_id % (kind %) does not reference a habit owned by user %', NEW.reference_id, NEW.kind, NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reminders_reference_ownership
    BEFORE INSERT OR UPDATE OF reference_id, kind, user_id ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION check_reminder_reference_ownership();
