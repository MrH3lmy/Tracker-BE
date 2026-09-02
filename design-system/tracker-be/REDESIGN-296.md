# Issue #296 redesign — actual UI UX Pro Max run + visual composition

This supersedes the earlier hand-authored `MASTER.md` and page docs in this folder, per the
PR #297 blocking review: that first pass reconstructed the workflow by hand because the plugin
install was blocked at the time. On retry it installed cleanly (`claude plugin marketplace add
nextlevelbuilder/ui-ux-pro-max-skill` → `claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill`,
both succeeded this run). Everything below reflects the actual tool output.

## 1. Commands run

Skill root: `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max` (resolved to
`~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.13.0/.claude/skills/ui-ux-pro-max`
in this session).

```bash
# Step 2/2b/2c: design system, persisted with the Master + overrides pattern
python search.py "personal productivity project operating system task planning dashboard" \
  --design-system -p "Tracker" --variance 6 --motion 4 --density 8
# -> Pattern matched was a landing-page pattern ("Product Demo + Features"); retried narrower:
python search.py "internal productivity dashboard SaaS tool" \
  --design-system -p "Tracker-BE" --variance 6 --motion 4 --density 8 --persist --force \
  --output-dir <repo-root>
# -> persisted to design-system/tracker-be/MASTER.md (this is the real, unedited tool output)

# Step 3: supplement - product-type pattern that actually fits an app screen, not a landing page
python search.py "productivity dashboard saas" --domain product -n 5

# Step 3: the review's exact list of focused searches (full transcripts in
# research/tool-transcripts/03-focused-searches.md)
python search.py "blocked task explanation progressive disclosure" --domain ux -n 3
python search.py "ready task actionable status" --domain ux -n 3
python search.py "dashboard information hierarchy" --domain ux -n 3
python search.py "activity timeline scanning" --domain ux -n 3
python search.py "responsive tabs mobile navigation" --domain ux -n 3
python search.py "loading empty error states" --domain ux -n 3
python search.py "badge chip label accessibility" --domain ux -n 3
python search.py "keyboard focus interactive status" --domain ux -n 3
python search.py "task list information density" --domain ux -n 3
python search.py "project cockpit dashboard layout" --domain ux -n 3
python search.py "status indicator warning success icon" --domain icons -n 8
python search.py "dashboard productivity" --domain typography -n 3
python search.py "productivity dashboard functional colors" --domain color -n 3
python search.py "component structure performance" --stack react -n 3
python search.py "chip badge overflow nowrap" --stack html-tailwind -n 3
```

Raw output for every command above is in `research/tool-transcripts/`
(`01-design-system.md`, `02-design-system-retry.md`, `03-focused-searches.md`,
`04-icons-retry.md`). `MASTER.md` in this folder is the unedited `--persist` output of the
second command.

## 2. Where the aggregate `--design-system` output was overridden, and why

The skill's own instructions say to verify fit and retry once with a narrower query before
accepting a result (`SKILL.md` "Query Contract"); two results didn't fit an internal app screen
and were consciously not applied as-is:

- **`Pattern` field** (`Product Demo + Features`: hero/video/CTA landing-page structure). This
  comes from `landing.csv`, a marketing-page dataset - checked directly (`--domain landing
  "dashboard app"`), and every landing pattern in that database is a marketing/conversion page
  structure with no application to an already-existing internal app screen. Used the `product`
  domain's "Productivity Tool" result instead (`Primary Style: Flat Design + Micro-interactions`,
  `Dashboard Style: Drill-Down Analytics`) as the actual page-composition guidance - see §3.
- **Typography** (`--design-system` picked *Plus Jakarta Sans*, generic SaaS). The dedicated
  `--domain typography "dashboard productivity"` search returned a more specific match ranked
  above it: **"Dashboard Data"** (Fira Code heading / Fira Sans body, best-for "Dashboards,
  analytics, data visualization, admin panels" - a closer match than Plus Jakarta Sans's generic
  "SaaS products, web apps, dashboards, B2B, productivity tools"). Used Fira Sans/Fira Code
  instead, per the skill's own "Step 3: Supplement with Detailed Searches" workflow.
- **Icons** (`--domain icons` recommended Phosphor icons). Kept the existing curated
  `lucide-react` vocabulary (`components/ui/icons.ts`) instead of switching icon libraries
  app-wide: the tool's own accessibility guidance for icons (result 5 in the icons search,
  `icon-context-accessibility`) explicitly says "keep one visual family per surface" - lucide
  already *is* that one family across the whole app, and every semantic icon Phosphor suggested
  (warning, check, check-circle, x-circle, warning-circle) has a direct lucide equivalent already
  in use. Swapping icon libraries app-wide for a same-meaning icon would be pure churn with real
  regression risk, not a design improvement - out of scope for this issue's ask.

Everything else (color palette, Flat Design style, spacing/density scale, motion tier) was
applied as returned.

## 3. What actually changed (materially different from before)

| Aspect | Before | After |
|---|---|---|
| Palette | Blue brand (`#2563eb`) on a neutral grey/white canvas, glass/blur cards | Teal primary (`#0F766E`/`#14B8A6`) + burnt-orange caution (`#9A3412`/`#FB923C`) on a teal-tinted canvas (`#F0FDFA` light / `#071211` dark), per the tool's "Productivity Tool" color match |
| Typography | Inter everywhere | Fira Sans body, Fira Code for numeric/tabular readouts (stat counts, due dates) - the tool's "Dashboard Data" pairing |
| Surface style | Glassmorphism (`backdrop-blur`, translucent `bg-glass`) | Flat Design: opaque cards, no blur, definition from borders + color-blocked accent panels (per the tool's Style match: "no shadows, clean lines, bold colors") |
| Today page | New task data added as one more `Card` above the pre-existing stat-tile/timeline/habits stack | Two instrument panels (teal "Ready to work" hero with a live `font-mono` count, orange "Blocked" lane), each sub-grouped with a colored rail (red/teal/neutral for overdue/due-today/scheduled); habits/timeline/weekly-review/recommendations demoted into a narrower secondary sidebar column (`lg:grid-cols-[1fr_320px]`) |
| Project Overview | Progress `Card` → separate 3-stat-tile row → separate 4-stat-tile row → milestone/activity/notes cards stacked vertically | One merged health/readiness panel (radial progress ring + risk badge + a 3-way ready/blocked/overdue instrument row in a single bordered section) at the top, then an intentional `lg:grid-cols-[1fr_320px]` main/secondary split: milestone + effort stats in the main column, activity + notes as a supporting sidebar |
| Density | Default Tailwind spacing throughout | 8/10 dial applied to the new compositions specifically (tighter row padding, `divide-y` lists instead of bordered-box-per-row, `font-mono tabular-nums` for scannable numeric columns) |

Screenshots (light/dark, 375/768/1024/1440px) are attached to the PR.

## 4. Accessibility verification

Every new text/background pair was checked against WCAG 2.1 AA (4.5:1) before being written into
`theme.css` - script and full results in `research/contrast-check.py` (all pairs pass; run
`python3 research/contrast-check.py` to reproduce). The dark-theme primary button intentionally
uses **black text on the bright teal fill**, not white - this is the tool's own `On Primary:
#000000` spec (`MASTER.md` color table), and it measures 7.68:1 versus ~3.7:1 for white-on-teal
at that brightness.

## 5. Scope of the visual change

Applied to the **Light** ("Light Modern") and **Dark** ("Midnight Pro") themes - the two default
themes - plus every component that reads the shared `--color-*`/`--app-*` tokens (`Card`, `Badge`,
`Button`, focus rings, etc.), so the new look is consistent across the whole app, not just the
Today/Project pages. The three alternate themes (Aurora, Ocean Breeze, Forest) were left as-is:
they already have their own distinct brand hues and were not the subject of the review.
