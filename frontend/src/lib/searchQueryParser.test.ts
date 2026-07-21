import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from './searchQueryParser';

describe('parseSearchQuery', () => {
  it('extracts a single filter token and leaves the rest as free text', () => {
    expect(parseSearchQuery('invoice type:task')).toEqual({ freeText: 'invoice', type: 'task' });
  });

  it('extracts multiple filter tokens combined with free text', () => {
    const result = parseSearchQuery('renew type:task status:blocked area:work');
    expect(result).toEqual({ freeText: 'renew', type: 'task', status: 'blocked', area: 'work' });
  });

  it('supports due and tag filters', () => {
    expect(parseSearchQuery('due:this-week')).toEqual({ freeText: '', due: 'this-week' });
    expect(parseSearchQuery('tag:decision')).toEqual({ freeText: '', tag: 'decision' });
  });

  it('returns only free text when there are no filter tokens', () => {
    expect(parseSearchQuery('quarterly planning notes')).toEqual({ freeText: 'quarterly planning notes' });
  });

  it('leaves an unrecognized key:value token in the free text untouched', () => {
    expect(parseSearchQuery('meeting at 10:30am')).toEqual({ freeText: 'meeting at 10:30am' });
  });

  it('leaves a bare colon with no value as free text', () => {
    expect(parseSearchQuery('type:')).toEqual({ freeText: 'type:' });
  });

  it('handles extra whitespace between tokens', () => {
    expect(parseSearchQuery('  invoice   type:task  ')).toEqual({ freeText: 'invoice', type: 'task' });
  });

  it('is case-insensitive on the filter key but preserves the value case', () => {
    expect(parseSearchQuery('TYPE:Task')).toEqual({ freeText: '', type: 'Task' });
  });
});
