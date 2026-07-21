export interface ParsedSearchQuery {
  /** The query text with every recognized filter token removed. */
  freeText: string;
  type?: string;
  status?: string;
  due?: string;
  area?: string;
  tag?: string;
}

const FILTER_KEYS = ['type', 'status', 'due', 'area', 'tag'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const isFilterKey = (value: string): value is FilterKey => (FILTER_KEYS as readonly string[]).includes(value);

/**
 * Splits a search box query like "invoice type:task status:blocked" into free
 * text ("invoice") plus structured filters. Tokens are space-separated
 * `key:value` pairs; unrecognized keys are left in the free text untouched
 * (so a literal colon in normal text, e.g. "10:30am", doesn't get eaten).
 */
export function parseSearchQuery(input: string): ParsedSearchQuery {
  const tokens = input.split(/\s+/).filter(Boolean);
  const freeTextParts: string[] = [];
  const filters: Partial<Record<FilterKey, string>> = {};

  for (const token of tokens) {
    const separatorIndex = token.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      freeTextParts.push(token);
      continue;
    }
    const key = token.slice(0, separatorIndex).toLowerCase();
    const value = token.slice(separatorIndex + 1);
    if (isFilterKey(key)) {
      filters[key] = value;
    } else {
      freeTextParts.push(token);
    }
  }

  return { freeText: freeTextParts.join(' '), ...filters };
}
