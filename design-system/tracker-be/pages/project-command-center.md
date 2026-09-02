# Page override — Project Command Center (`/tasks/projects/:id`, redesigned per PR #297 review)

Implementation: `pages/ProjectDetailPage.tsx`. Six tabs unchanged (Overview · Today · Tasks ·
Milestones · Notes · Activity); this override covers the Overview composition, which is what the
blocking review specifically called out as "still a vertical series of ordinary cards."

## Composition (implemented)

**Instrument cluster** (top, full width): one bordered panel, not a Progress card followed by
separate stat tiles -
- Header band (`bg-brand-soft`): a radial progress ring (`conic-gradient`, teal fill) with the
  percentage in the center, risk badge, completed/total tasks, and the risk reason text.
- A 3-way readiness row directly beneath, in the same panel (`grid-cols-3 divide-x`): Ready to
  work (teal) / Blocked (orange) / Overdue (red), each a real `<button>` linking into the Tasks
  tab pre-filtered (`?tab=tasks&readiness=...`) - clicking is real navigation, not decorative.

**Main / secondary column split** (`lg:grid-cols-[minmax(0,1fr)_320px]`), directly under the
cluster:
- **Main**: Next milestone card, then a 4-up stat grid (active tasks / overdue / estimated /
  actual hours, `font-mono` numerals).
- **Secondary** (`aside`): Recent activity (3 most recent `ActivityTimelineItem`s), Recent notes
  (3 most recent, reusing `NoteCard`) - supporting context, not equal-weight with the readiness
  cluster, per the review's explicit ask.

Mobile: single column, cluster → main → secondary, in that order.

## What stayed the same (per "preserve the good functional work")

- `?tab=`/`?readiness=` URL-driven tab and filter state.
- The Tasks/Milestones/Notes/Activity tab contents (`ProjectNotesTab`, `ProjectActivityTab`,
  `ProjectTodayTab`) - untouched, they already got their own distinct treatment in the first pass
  and weren't called out in the review.
- All React Query hooks, mutations, and the existing test suite's selectors (tab names, "Ready to
  work"/"Blocked"/"Filtered: Blocked" text, empty-state copy) - the review's explicit instruction
  not to throw away functional work.

## Design tokens applied

Same teal/orange/red instrument coloring as Today (`../pages/today.md`), `font-mono` for every
numeral, flat panel style (opaque `bg-card`, no blur) per `../MASTER.md`.
