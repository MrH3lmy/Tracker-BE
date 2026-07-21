import { AREA_VALUES } from '../components/tasks/taskUtils';

export type ParsedTaskArea = (typeof AREA_VALUES)[number];

export interface ParsedTask {
  /** Remaining text after every recognized token has been stripped out. */
  title: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  /** HH:mm, 24-hour */
  dueTime?: string;
  /** Raw #tag text as typed, lowercased. */
  tag?: string;
  /** `tag` mapped onto a known task area, when it matches one exactly. */
  area?: ParsedTaskArea;
  important: boolean;
  estimatedMinutes?: number;
  /**
   * False when the parse involved a guess worth confirming (a time with no
   * explicit date, or leftover digits in the title that might be an
   * unrecognized token) -- callers should show a preview before saving.
   */
  confident: boolean;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

function extractTag(remaining: string): { remaining: string; tag?: string; area?: ParsedTaskArea } {
  const match = remaining.match(/#(\w+)/);
  if (!match) return { remaining };
  const tag = match[1].toLowerCase();
  const area = AREA_VALUES.find((value) => value.toLowerCase() === tag);
  return { remaining: remaining.replace(match[0], ' '), tag, area };
}

function extractImportant(remaining: string): { remaining: string; important: boolean } {
  const match = remaining.match(/!\s?(important|high|urgent)\b/i);
  if (!match) return { remaining, important: false };
  return { remaining: remaining.replace(match[0], ' '), important: true };
}

function extractDuration(remaining: string): { remaining: string; estimatedMinutes?: number } {
  const hourMinMatch = remaining.match(/\b(\d+)\s?h\s?(\d+)\s?m\b/i);
  if (hourMinMatch) {
    return {
      remaining: remaining.replace(hourMinMatch[0], ' '),
      estimatedMinutes: Number(hourMinMatch[1]) * 60 + Number(hourMinMatch[2]),
    };
  }
  const hourMatch = remaining.match(/\b(\d+(?:\.\d+)?)\s?h\b/i);
  if (hourMatch) {
    return { remaining: remaining.replace(hourMatch[0], ' '), estimatedMinutes: Math.round(Number(hourMatch[1]) * 60) };
  }
  const minMatch = remaining.match(/\b(\d+)\s?m\b/i);
  if (minMatch) {
    return { remaining: remaining.replace(minMatch[0], ' '), estimatedMinutes: Number(minMatch[1]) };
  }
  return { remaining };
}

function extractTime(remaining: string): { remaining: string; dueTime?: string } {
  const match = remaining.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/i);
  if (!match) return { remaining };
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3].toLowerCase();
  if (hour < 1 || hour > 12 || minute > 59) return { remaining };
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return {
    remaining: remaining.replace(match[0], ' '),
    dueTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

function extractDate(remaining: string, now: Date): { remaining: string; dueDate?: string } {
  if (/\btoday\b/i.test(remaining)) {
    return { remaining: remaining.replace(/\btoday\b/i, ' '), dueDate: toDateKey(now) };
  }
  if (/\btomorrow\b/i.test(remaining)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return { remaining: remaining.replace(/\btomorrow\b/i, ' '), dueDate: toDateKey(date) };
  }
  const weekdayMatch = remaining.match(/\b(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (weekdayMatch) {
    const targetIndex = WEEKDAYS.indexOf(weekdayMatch[1].toLowerCase());
    const currentIndex = now.getDay();
    const delta = ((targetIndex - currentIndex + 7) % 7) || 7;
    const date = new Date(now);
    date.setDate(date.getDate() + delta);
    return { remaining: remaining.replace(weekdayMatch[0], ' '), dueDate: toDateKey(date) };
  }
  return { remaining };
}

/**
 * Rule-based, local (no network/LLM) parser for quick-capture task input like
 * "Finish payment service tomorrow 4pm #work !important 90m". Every field is
 * optional in the output; only `title` is guaranteed. Order matters: strip
 * the most specific tokens (tag, importance, duration, time, date) first so
 * ambiguous leftovers don't get misread as part of the title.
 */
export function parseNaturalLanguageTask(input: string, now: Date = new Date()): ParsedTask {
  let remaining = input;

  const tagResult = extractTag(remaining);
  remaining = tagResult.remaining;

  const importantResult = extractImportant(remaining);
  remaining = importantResult.remaining;

  const durationResult = extractDuration(remaining);
  remaining = durationResult.remaining;

  const timeResult = extractTime(remaining);
  remaining = timeResult.remaining;

  const dateResult = extractDate(remaining, now);
  remaining = dateResult.remaining;

  const title = collapseWhitespace(remaining);
  const dueDate = dateResult.dueDate ?? (timeResult.dueTime ? toDateKey(now) : undefined);
  const impliedDate = !dateResult.dueDate && Boolean(timeResult.dueTime);
  const leftoverDigits = /\d/.test(title);

  return {
    title,
    dueDate,
    dueTime: timeResult.dueTime,
    tag: tagResult.tag,
    area: tagResult.area,
    important: importantResult.important,
    estimatedMinutes: durationResult.estimatedMinutes,
    confident: !impliedDate && !leftoverDigits,
  };
}
