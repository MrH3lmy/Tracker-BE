import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

describe('TabsList/TabsTrigger responsiveness', () => {
  it('lays out triggers as equal-width, shrinkable flex items so a narrow container does not clip the last tab', () => {
    render(
      <Tabs defaultValue="collections">
        <TabsList className="w-full">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="savedViews">Saved views</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
        <TabsContent value="collections">Collections panel</TabsContent>
      </Tabs>,
    );

    const list = screen.getByRole('tablist');
    // `inline-flex` shrink-to-fit sizing plus non-shrinking children is what let "Recent"
    // get clipped by the panel's right edge; the list must be a block-level flex container...
    expect(list.className).not.toContain('inline-flex');
    expect(list.className).toContain('min-w-0');

    // ...and every trigger, including the last one, must be an equal-width, shrinkable item.
    for (const name of ['Collections', 'Saved views', 'Recent']) {
      const trigger = screen.getByRole('tab', { name });
      expect(trigger.className).toContain('min-w-0');
      expect(trigger.className).toContain('flex-1');
      expect(trigger.className).toContain('truncate');
      expect(trigger).toBeVisible();
    }
  });
});
