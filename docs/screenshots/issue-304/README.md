# Tasks workspace — visual evidence (issue #304)

Captured from the **implemented UI**, not mockups: the real frontend (`npm run dev`) against the
real backend (`local-test` profile, H2) seeded through the public REST API with 17 active tasks,
3 projects, 5 real dependency links, subtasks, an overdue/important/high-risk task, a `WAITING`
task with a follow-up date, a manually-`BLOCKED` task with no dependencies, a 128-character title
and a 62-character project name. Readiness in every shot is whatever the backend computed.

| # | Shot | Shows |
|---|---|---|
| 01 | `01-desktop-light-all.png` | Default workspace, 1440px light |
| 02 | `02-desktop-light-ready.png` | Ready lens — actionable work only |
| 03 | `03-desktop-light-blocked-expanded.png` | Blocked lens with the `+n more` blocker disclosure open |
| 04 | `04-desktop-light-overdue.png` | Overdue signal |
| 05 | `05-desktop-light-active-filters.png` | Search + project filter + sort, each a removable chip |
| 06 | `06-desktop-light-filters-popover.png` | Secondary filters (status / project / area / effort / due range) |
| 07 | `07-desktop-light-saved-views.png` | Saved views, promoted to a toolbar control |
| 08 | `08-desktop-light-create-task.png` | Create task — quick-capture essentials |
| 09 | `09-desktop-light-create-task-more-details.png` | Create task — "More details" disclosure open |
| 10 | `10-desktop-light-done.png` | Done scope |
| 11 | `11-desktop-light-archived.png` | Archived scope |
| 12 | `12-desktop-light-empty-filtered.png` | Filtered-empty state with a way out |
| 13 | `13-desktop-light-empty-no-ready.png` | "No tasks are ready" pointing at blocked work |
| 14 | `14-desktop-dark-all.png` | Dark mode, 1440px |
| 15 | `15-desktop-dark-blocked-expanded.png` | Dark mode blocker disclosure |
| 16 | `16-desktop-dark-create-task.png` | Dark mode create task |
| 17 | `17-laptop-1024-light.png` | 1024px |
| 18 | `18-tablet-768-light.png` | 768px |
| 19 | `19-mobile-375-light-all.png` | 375px light |
| 20 | `20-mobile-375-light-blocked-expanded.png` | 375px blocker disclosure |
| 21 | `21-mobile-375-light-row-actions.png` | 375px row actions — reachable without hover |
| 22 | `22-mobile-375-dark-all.png` | 375px dark |
| 23 | `23-mobile-375-dark-create-task.png` | 375px dark create task |

Images are downscaled 2:1 from the 2x captures to keep the repository small.

## Measured horizontal overflow

`document.documentElement.scrollWidth - clientWidth`, measured on `/tasks` with this dataset:

| Width | Light | Dark |
|---|---|---|
| 320px | 0px | 0px |
| 375px | 0px | 0px |
| 414px | 0px | 0px |
| 768px | 0px | 0px |
| 1024px | 0px | 0px |
| 1440px | 0px | 0px |

No element inside the workspace extends past the viewport at any of those widths, so nothing is
clipped rather than merely un-scrolled.
