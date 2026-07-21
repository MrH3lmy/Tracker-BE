import { describe, expect, it } from 'vitest';
import { parseNaturalLanguageTask } from './naturalLanguageTaskParser';

// Fixed reference "now": Wednesday, 2026-07-15 (matches this repo's fixture style).
const NOW = new Date(2026, 6, 15, 9, 0, 0);

describe('parseNaturalLanguageTask', () => {
  it('parses the full example from the product brief', () => {
    const result = parseNaturalLanguageTask('Finish payment service tomorrow 4pm #work !important 90m', NOW);

    expect(result.title).toBe('Finish payment service');
    expect(result.dueDate).toBe('2026-07-16');
    expect(result.dueTime).toBe('16:00');
    expect(result.tag).toBe('work');
    expect(result.area).toBe('WORK');
    expect(result.important).toBe(true);
    expect(result.estimatedMinutes).toBe(90);
    expect(result.confident).toBe(true);
  });

  it('returns just a title when nothing else is recognized', () => {
    const result = parseNaturalLanguageTask('Buy milk', NOW);

    expect(result.title).toBe('Buy milk');
    expect(result.dueDate).toBeUndefined();
    expect(result.dueTime).toBeUndefined();
    expect(result.tag).toBeUndefined();
    expect(result.important).toBe(false);
    expect(result.estimatedMinutes).toBeUndefined();
    expect(result.confident).toBe(true);
  });

  it('parses "today"', () => {
    const result = parseNaturalLanguageTask('Call the bank today', NOW);
    expect(result.dueDate).toBe('2026-07-15');
    expect(result.title).toBe('Call the bank');
  });

  it('parses a bare weekday as the next upcoming occurrence', () => {
    // NOW is Wednesday 2026-07-15; next Friday is 2026-07-17.
    const result = parseNaturalLanguageTask('Review PR friday', NOW);
    expect(result.dueDate).toBe('2026-07-17');
  });

  it('rolls a same-weekday mention over to next week, not today', () => {
    // NOW is Wednesday; asking for "wednesday" should mean next Wednesday, not today.
    const result = parseNaturalLanguageTask('Standup wednesday', NOW);
    expect(result.dueDate).toBe('2026-07-22');
  });

  it('parses hours-only duration', () => {
    const result = parseNaturalLanguageTask('Deep work session 2h', NOW);
    expect(result.estimatedMinutes).toBe(120);
    expect(result.title).toBe('Deep work session');
  });

  it('parses combined hours and minutes duration', () => {
    const result = parseNaturalLanguageTask('Write the report 1h30m', NOW);
    expect(result.estimatedMinutes).toBe(90);
  });

  it('parses minutes-only duration', () => {
    const result = parseNaturalLanguageTask('Quick sync 15m', NOW);
    expect(result.estimatedMinutes).toBe(15);
  });

  it('parses 12-hour time with am/pm and normalizes to 24-hour', () => {
    expect(parseNaturalLanguageTask('Lunch 12pm', NOW).dueTime).toBe('12:00');
    expect(parseNaturalLanguageTask('Wake up 12am', NOW).dueTime).toBe('00:00');
    expect(parseNaturalLanguageTask('Meeting 9:30am', NOW).dueTime).toBe('09:30');
  });

  it('maps a recognized #tag onto a task area', () => {
    const result = parseNaturalLanguageTask('Renew gym membership #health', NOW);
    expect(result.tag).toBe('health');
    expect(result.area).toBe('HEALTH');
    expect(result.title).toBe('Renew gym membership');
  });

  it('keeps the raw tag but leaves area unset when it does not match a known area', () => {
    const result = parseNaturalLanguageTask('Plan trip #vacation', NOW);
    expect(result.tag).toBe('vacation');
    expect(result.area).toBeUndefined();
  });

  it('recognizes !important, !high, and !urgent as the important flag', () => {
    expect(parseNaturalLanguageTask('Fix outage !important', NOW).important).toBe(true);
    expect(parseNaturalLanguageTask('Fix outage !high', NOW).important).toBe(true);
    expect(parseNaturalLanguageTask('Fix outage !urgent', NOW).important).toBe(true);
  });

  it('flags low confidence when a time is given without an explicit date (defaults to today)', () => {
    const result = parseNaturalLanguageTask('Call supplier 3pm', NOW);
    expect(result.dueDate).toBe('2026-07-15');
    expect(result.dueTime).toBe('15:00');
    expect(result.confident).toBe(false);
  });

  it('flags low confidence when digits remain in the title after extraction', () => {
    const result = parseNaturalLanguageTask('Order 3 boxes of paper', NOW);
    expect(result.title).toBe('Order 3 boxes of paper');
    expect(result.confident).toBe(false);
  });

  it('trims and collapses whitespace left behind by removed tokens', () => {
    const result = parseNaturalLanguageTask('  Finish   deck   tomorrow   #work  ', NOW);
    expect(result.title).toBe('Finish deck');
  });
});
