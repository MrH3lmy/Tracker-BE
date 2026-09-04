# #308 shell evidence

Captured against the real application (Vite dev server, Playwright, `deviceScaleFactor: 2`),
with `/api/v1/**` stubbed so the shell renders for an authenticated user.
Developer destinations appear because these were taken in a dev build.

**Every capture reported `document.documentElement.scrollWidth - clientWidth === 0`
— no unintended horizontal page overflow at any breakpoint, in either theme.**

| File | Shows |
|---|---|
| `desktop-1440-light-today.png` | 1440 light: grouped sidebar, breadcrumb, top-bar search, account menu |
| `desktop-1440-dark-today.png` | 1440 dark: same shell, neutral dark chrome |
| `desktop-1440-light-tasks-projects.png` | Nested route inside the shell, `Tasks › Projects` breadcrumb |
| `desktop-1440-dark-notes.png` | An already-revamped workspace adopting the new tokens unchanged |
| `desktop-1440-light-focus-ring.png` | Visible 2px focus ring at 2px offset (keyboard focus) |
| `desktop-1440-light-skip-link.png` | Skip link, first in the tab order, visible on focus |
| `desktop-1440-light-account-menu.png` | Log out separated behind the account menu, styled destructive |
| `desktop-1024-light-sidebar.png` | 1024: full sidebar tier |
| `tablet-768-light-rail.png` | 768: labelled rail tier — one nav mechanism, no tab bar |
| `mobile-375-light-today.png` | 375 light: top bar + 5-item labelled tab bar + quick-add FAB |
| `mobile-375-dark-today.png` | 375 dark |
| `mobile-375-light-more-sheet.png` | "More" sheet: the single route to everything off the bar |
| `mobile-375-dark-more-sheet.png` | Same, dark |
