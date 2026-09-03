# Page override — Notes knowledge workspace (issue #299)

> Overrides `../MASTER.md` for `/notes` only. Everything not restated here (palette, Fira
> Sans/Fira Code, flat surfaces, density 8/10, motion tier, focus rules) is inherited unchanged
> from Master + `../REDESIGN-296.md`. This is **not** a new design language: no new palette, no
> new type system, no new icon library. `pages/notes.md` (issue #296, typed notes) stays valid
> and is extended — not replaced — by this file.

## 1. Research actually run

Skill: `ui-ux-pro-max` v2.13.0 (`nextlevelbuilder/ui-ux-pro-max-skill`). It was not present in
this session's container (containers are ephemeral; the #297 install did not survive), so it was
re-installed from the upstream repo into `~/.claude/skills/ui-ux-pro-max` and invoked as
`python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py …`.

Full unedited stdout for every command is in
`../research/tool-transcripts/05-notes-workspace-299.md`. Commands, in order:

```bash
# Product / navigation architecture
search.py "note taking knowledge base app"          --domain product -n 3
search.py "sidebar navigation hierarchy"            --domain ux -n 3
search.py "search filter results"                   --domain ux -n 4
# Search / discovery ergonomics
search.py "search input placeholder clarity"        --domain ux -n 3
search.py "progressive disclosure advanced options" --domain ux -n 3
search.py "filter chip removable label"             --domain ux -n 3
# Dense list / card scanning
search.py "list density scanning readability"       --domain ux -n 3
search.py "card content truncation overflow"        --domain ux -n 3
search.py "long text truncation ellipsis"           --domain ux -n 3
# Capture / editor
search.py "form field grouping sections"            --domain ux -n 3
search.py "inline validation error clarity"         --domain ux -n 3
search.py "autosave draft unsaved changes"          --domain ux -n 3
# Images / attachments
search.py "image thumbnail lazy loading"            --domain ux -n 3
search.py "image alt text descriptive"              --domain ux -n 3
# Mobile / responsive
search.py "mobile drawer bottom sheet navigation"   --domain ux -n 3
search.py "responsive breakpoint mobile first"      --domain ux -n 3
search.py "touch target size spacing"               --domain ux -n 3
# Keyboard / accessibility
search.py "keyboard shortcut discoverability"       --domain ux -n 3
search.py "focus not obscured"                      --domain ux -n 3
search.py "visible focus indicator"                 --domain ux -n 3
# States
search.py "empty state guidance next action"        --domain ux -n 3
search.py "skeleton loading placeholder"            --domain ux -n 3
search.py "error retry recovery"                    --domain ux -n 3
# Icons / typography / style
search.py "folder collection bookmark navigation icon" --domain icons -n 6
search.py "decorative icon aria hidden"             --domain icons -n 3
search.py "documentation knowledge reading"         --domain typography -n 3
search.py "flat minimal documentation workspace"    --domain style -n 3
# Stack
search.py "list rendering memo virtualize"          --stack react -n 3
search.py "sidebar layout grid responsive"          --stack html-tailwind -n 3
search.py "truncate line clamp overflow"            --stack html-tailwind -n 3
# Issue-specific
search.py "primary action button hierarchy"         --domain ux -n 3
search.py "checkbox list task completion"           --domain ux -n 3   # 0 results
search.py "tab panel content switching"             --domain ux -n 3
search.py "modal dialog focus trap escape"          --domain ux -n 3
search.py "reduced motion animation preference"     --domain ux -n 3
search.py "dark mode contrast surface"              --domain ux -n 3
# Retry after the 0-result query, per SKILL.md "If a search returns 0 results"
search.py "checkbox state announcement"             --domain ux -n 3
search.py "nav hierarchy active state"              --domain ux -n 3
```

`--design-system` was deliberately **not** re-run. `MASTER.md` already exists and the skill's own
Step 2b says `--persist` skips an existing Master unless `--force`, which needs explicit user
authorisation; the issue explicitly says not to regenerate a second app-wide language. Focused
`--domain` searches (the skill's Step 3) are the correct mode for a single-page concern.

### Results applied, and where they were not

| Tool result | Applied as |
|---|---|
| `product` → **Knowledge Base/Documentation**: *"Minimalism & Swiss Style + Accessible & Ethical; secondary Flat Design; Clean hierarchy + minimal color"* | The whole card/nav redesign: one accent (teal) doing the work, note type expressed as text+icon rather than a seventh badge colour, generous type hierarchy inside a dense grid. Flat Design (already Master's style) is the listed secondary, so no style switch was needed. |
| `style` → **minimalism-and-swiss-style**: *"Grid-based layout, typography hierarchy clear, no unnecessary decorations"* | `lg:grid-cols-[17rem_minmax(0,1fr)]` workspace grid; removal of per-card decoration that carried no information. |
| `ux` Search → **No Results**: *"Show 'No results' with suggestions"*, **Autocomplete**: *"Debounced fetch"* | Empty state names the active constraint and offers to clear it; search input is debounced (250 ms) instead of refetching per keystroke. |
| `ux` Layout → **Chip Collection Reflow** (High): *"Wrap the collection or use an operable +n disclosure"* | Active-filter chips wrap (`flex-wrap`), never a clipped fixed-height row. Tags on a card show 4 then an operable `+N` button that reveals the rest — not a hover tooltip. |
| `ux` Content → **Compact Label Overflow** (High) and html-tailwind → **Compact label layout**: *"min-w-0 whitespace-nowrap truncate, dismiss icons shrink-0"* | Every chip/badge: `min-w-0 truncate` label with `shrink-0` clear button. |
| `ux` Content → **Essential Text Truncation** (Critical): *"Don't clamp essential meaning only to make cards uniform"* | Note **titles** are never single-line truncated — they wrap (`line-clamp-2 break-words`), because the title is the note's identity. Only the body excerpt is clamped, and it always has an expand path (open the note). |
| `ux` Content → **Truncation**: *"Truncate with ellipsis and expand option"* | Body excerpt clamped to 2 lines (row) / 4 lines (tile) with the card itself as the expand affordance. |
| `ux` Typography → **Line Height** / html-tailwind → **Line height**: *"1.5–1.75 for body"* | Excerpt uses `leading-relaxed`; density stays 8/10 through padding, not line-height. |
| `ux` Forms → **Input Labels** (High): *"never placeholder as only label"* | Every filter control keeps a real `<label>`; the search input keeps an `sr-only` label plus placeholder (programmatic name present, not placeholder-only). |
| `ux` Forms → **Submit Feedback**, **Error Placement**, `ux` Feedback → **Error Recovery**: *"Try again button + help link"* | Result error state gets an explicit **Retry** button (previously a bare red sentence with no recovery path). |
| `ux` Feedback → **Loading Indicators** (High): *"preserve layout, focus and accessible busy status"* | Result loading state is a skeleton list that reserves the same row height as real results, with `role="status"`, instead of a one-line "Loading notes…" that collapsed the layout. |
| `ux` Feedback → **Empty States**: *"helpful message and action"* | Every empty state (no notes / no matches / empty smart view / empty collection) names the next useful action. |
| `ux` Performance → **Lazy Loading**, **Image Optimization**, Responsive → **Image Scaling**; `ux` A11y → **Alt Text** | Screenshots in results become `loading="lazy"` fixed-ratio thumbnails with `max-w-full` and real alt text, not full-bleed images inside every card. |
| `ux` Navigation → **Active State**: *"Highlight active nav item"* | Workspace nav marks the active smart view/collection/saved view with `aria-current="true"` **and** a colour + left rail (never colour alone). |
| `ux` Navigation → **Back Button**: *"Preserve navigation history properly"* | Smart view / project / type / collection / search state is mirrored into the URL (`?view=`, `?projectId=`, `?collectionId=`, `?type=`, `?q=`) so every state is linkable, but with `replace: true` — a filter tweak or a keystroke must not become a history entry, or Back would step backwards through a search word letter by letter instead of returning the user to the project page they came from. |
| `ux` A11y → **Heading Hierarchy**: *"sequential h1–h6"* | Page `h2` → section `h3` (nav groups, result region) → card `h4`. Card titles moved from `h3` to `h4` under the results `h3`. |
| `ux` A11y → **Keyboard Navigation**, **Focus States**, **Focus Not Obscured (Minimum)** | Type lenses are a roving-focus toggle group; the sticky search bar uses `scroll-mt` so a focused result is never hidden behind it; no action is hover-only. |
| `ux` Touch → **Target Size (Minimum)** (24 CSS px web rule) + **Touch Spacing** (8 px) | Nav rows and lens chips are `min-h-9`/`min-h-11` on touch widths with `gap-2`; the tool's own note that 44 pt is the *native* rule and web conformance is the separate 24×24 criterion is why nav rows are 36 px on desktop and 44 px on mobile rather than 44 px everywhere. |
| `ux` Animation → **Reduced Motion** (High), **Excessive Motion** | No new animation beyond the existing 120 ms colour transitions; the mobile nav sheet is the only moving surface and inherits the global `prefers-reduced-motion` reset in `theme.css`. |
| `react` → **Use keys properly** (High), **Use React.memo wisely** | Results keyed by `note.id`; `memo` applied only to `NoteResultCard`, which has a real render cost (code tokenising) and stable props. |
| `html-tailwind` → **Grid gaps**, **Responsive padding** | `gap-4`/`gap-5` on the workspace grid, `p-4 sm:p-5` on panels. |
| `icons` → **icon-context-accessibility**: *"keep one visual family per surface"* | **Not** applied as written (it recommends Phosphor). Same decision and reason as `../REDESIGN-296.md` §2: `lucide-react` already *is* the single family for the whole app, and every icon the search suggested (folder, folder-open, bookmark, list) has a direct lucide equivalent. Swapping libraries for one page would break the "one family per surface" rule the result itself states. The accessibility half of the result **is** applied verbatim: decorative icons `aria-hidden`, icon-only controls get an accessible name. |
| `typography` → *Academia Mobile* (Cormorant/Crimson) top result | **Not** applied. It is a scholarly-reading serif stack for long-form reading products; this is a dense productivity surface inside an app that already committed to the tool's own "Dashboard Data" pairing in #297. Result 2 of the same search (*Minimal Swiss — "dashboards, admin panels, documentation"*) confirms a neutral sans is the right family; Fira Sans already fills that role. No font change. |
| `ux` → **Breadcrumbs** (*"use for 3+ levels; don't for flat"*) | **Not** applied as breadcrumbs — the workspace is two levels. Applied instead as the context banner: entering via `?projectId=` shows the project name and a "Show all notes" escape. |

## 2. Information architecture — before → after

**Before**

```
PageHeader (Notes + New note)
Sidebar: [Tabs: Collections | Saved views | Recent]      ← nested tabs inside a sidebar
         Collapsible "Task-linked notes" (top 5, client-side)
         Collapsible "Archived" (top 5, client-side, tag==archived)
Panel:   "Browse notes"
         [ search ] [ Filters & sort ▾ (16 controls in one popover) ]
         [ active chips ]
         [ Sticky board | List | Table | Timeline ]  ← 4-up text segmented control
         results
```

Problems: three competing navigation mechanisms (tabs, collapsibles, saved views); "Recent /
Task-linked / Archived" were *teasers* (5 items, computed from the loaded page) that jumped
straight into the editor rather than filtering the library; note type was buried as option 4 of a
select inside a popover; every filter had equal weight; every card rendered full-size screenshots
and a full action-item panel.

**After**

```
Workspace header      Notes · "Your working knowledge library"     [Capture ▾] [New note]
Context banner        (only when ?projectId= / ?taskId= is set)     [Show all notes]
┌ Workspace nav ────────────┬ Knowledge explorer ─────────────────────────────┐
│ SMART VIEWS               │ [ 🔍 Search your notes…                       ] │
│   All notes               │ [All][Meeting][Decision][Research][Technical]…  │  ← type lenses
│   Recent                  │ Project ▾  Collection ▾  Tag  [More filters ▾]  │
│   Meeting notes           │ active filter chips (wrap, individually clearable)
│   Decisions               ├─────────────────────────────────────────────────┤
│   Research                │ Showing N notes   [▦][≡][▤][◷]  Sort ▾          │
│   Technical               │                                                 │
│   Requirements            │  NOTE RESULTS                                   │
│   Retrospective           │  Architecture decision                          │
│   Screenshots             │  Decision · Tracker · updated 40m ago           │
│   Task notes              │  Why we chose PostgreSQL over…                  │
│   Checklists              │  ⚑ 3 action items · 📎 2 screenshots            │
│   Untagged                │  backend  adr  +3                               │
│   Archived                │                                                 │
│ COLLECTIONS  (+ colour)   │                                                 │
│ SAVED VIEWS  (+ save/del) │                                                 │
└───────────────────────────┴─────────────────────────────────────────────────┘
```

Key moves:

1. **One navigation mechanism.** A single flat rail with three labelled groups
   (`SMART VIEWS` / `COLLECTIONS` / `SAVED VIEWS`), each a `<nav>`-scoped list with
   `aria-current`. No tabs-in-sidebar, no collapsibles-under-tabs.
2. **Smart views became real, server-side views** instead of 5-item client-side teasers. Selecting
   one sets the actual query filters, so "Task notes" now means *all* task-linked notes
   (`linkedTask=true`), "Archived" means *all* `tag=archived` notes, "Recent" is an explicit
   `sortBy=updatedAt&sortDirection=desc`. Clicking a smart view filters the library; it no longer
   opens the editor behind your back.
3. **Note type is navigation.** Six typed views live in the rail, and a lens row sits directly
   under search for lateral movement. Type still appears on the card, but as a quiet
   icon + label in the meta line — not one of seven coloured badges.
4. **Search is the loudest control on the page** (full-width, `h-11`, its own row) and is
   debounced. Project / Collection / Tag sit under it as the three high-value context filters;
   the ten long-tail filters (content type, attachment state, task-link state, tag status, tag
   match mode, four date bounds, sort field/direction) stay in the `More filters` popover.
5. **Card hierarchy is now ranked**, not flat: title → type·project·time → excerpt → signals →
   tags → actions. Screenshots became thumbnails, action items became a compact capped list,
   prose notes lost the code-editor chrome they never needed.
6. **Capture is a cluster, not a button**: `New note` (primary) + a `Capture ▾` menu holding
   *From template* and *Capture screen area*, so template-created notes stop being option 3 of an
   "Advanced" tab inside the editor.

## 3. Component map

| Component | Role |
|---|---|
| `NotesPage` | Shell + orchestration only. All filter state moved to `useNotesWorkspace`. |
| `useNotesWorkspace` | URL-synced filter/sort/view/smart-view state, debounced search, active-chip derivation, saved-view application. |
| `notesSmartViews.ts` | The 12 built-in views: id, label, lucide icon, description, filter patch. Single source for the rail, the empty states and the chips. |
| `NotesWorkspaceHeader` | Title, subtitle, reload, `New note`, `Capture ▾`. |
| `NotesContextBanner` | `?projectId=` / `?taskId=` context + escape link. |
| `NotesWorkspaceNav` | The rail. Same component renders inside the mobile `Drawer`. |
| `NotesSearchBar` | Search + type lenses + context filters + `More filters` popover + active chips. |
| `NotesResultToolbar` | Honest result count, view switcher, sort. |
| `NotesResultView` | sticky / list / table / timeline dispatch. |
| `NoteResultCard` (`NoteCard.tsx`) | The ranked card. Also used by Project Command Center → Notes. |
| `CreateNoteDrawer` | One create+edit surface, restructured writing-first. |

## 4. Card specification

```
┌─────────────────────────────────────────────────────────────┐
│ ▌ PACI integration meeting                          [⋯]     │  h4, line-clamp-2, break-words
│ ▌ ⧉ Meeting · Tracker Mobile App · updated 40m ago          │  13px muted, icon aria-hidden
│ ▌ Agreed to retry the callback with jittered backoff…       │  line-clamp-2, leading-relaxed
│ ▌ ☑ 3 action items · 1 converted   📎 2 screenshots         │  signal row, only when non-empty
│ ▌ [ ] Investigate callback retry        [Convert to task]   │  ≤3 rows, then "Show all N"
│ ▌ [✓] Update API docs                   [Task #318 ↗]       │
│ ▌ ▭▭ ▭▭                                                     │  96×64 lazy thumbnails
│ ▌ backend  integration  paci  +3                            │  4 tags then operable +N
└─────────────────────────────────────────────────────────────┘
  ▌ = 2px content-type/colour rail (unchanged from #296)
```

Rules:
- Type + project are **text**, not colour. The rail keeps the existing content-type colour coding,
  which is redundant-with-text (the meta line names the content type in table view and the code
  preview header names the language), never the sole carrier of meaning.
- Action items render at most 3; `Show all N action items` expands. Converted items are a link to
  the canonical task and are never re-convertible (preserves the `noteBlockId` idempotency
  contract from #296/#287).
- Screenshots render as ≤3 thumbnails + `+N`; each is a link to the full attachment.
- Prose content types (`PLAIN_TEXT`, `MARKDOWN`) get a plain clamped excerpt. Code content types
  (`SHELL_COMMANDS`, `XML`, `JSON`) keep the existing `CodePreview` chrome — that chrome is
  meaningful for a command/JSON snippet and noise for a meeting note.

Ugly-data cases explicitly designed for and tested: 200-char unbroken title, 12 tags, 5 action
items, 4 screenshots, 2000-char code body, 60-char project name, no project, no tags, no excerpt.

## 5. Responsive

| Width | Layout |
|---|---|
| `<1024px` | Single column. The rail collapses into a `Browse` button that opens the same `NotesWorkspaceNav` inside a `Drawer`. Search stays full width and first. Type lenses become a horizontally scrollable row (`overflow-x-auto`, the page itself never scrolls sideways). View switcher becomes icon-only with accessible names. |
| `≥1024px` | `grid-cols-[16rem_minmax(0,1fr)]`, rail sticky at `top-4`. |
| `≥1280px` | `grid-cols-[17rem_minmax(0,1fr)]`, list results allow a wider excerpt measure. |

Verified at 375 / 768 / 1024 / 1440 in light and dark. No horizontal page overflow: every wide
child (table, code preview, lens row) owns its own `overflow-x-auto` container.

## 6. Counts — what may be displayed

The list endpoint returns a bounded page (100, "load more" to 200) and no total. Therefore:

- **Allowed:** "Showing 42 notes" / "Showing first 100 notes — load more", i.e. a count of what is
  actually rendered, labelled as such.
- **Allowed:** per-note counts derived from that note's own payload (its action items, its
  attachments, its tags).
- **Forbidden:** any global KPI — total notes, notes per type, notes per collection, "52
  decisions" — the backend provides no reliable total, and deriving one from the first page would
  be a fabricated statistic. No such number appears anywhere in the redesign.

## 7. Backend

No backend change. Every filter the new IA uses (`q`, `tag`, `tagMode`, `collectionId`,
`projectId`, `type`, `contentType`, `hasAttachments`, `linkedTask`, `untagged`, date bounds,
`sortBy`, `sortDirection`, `page`, `size`) is already a `GET /api/v1/notes` request parameter, and
`NoteResponse.blocks` (added by #296) already carries what the action-item signal needs. The one
contract gap found in #296 was fixed there and is not re-litigated here.

---

# Part 2 — The note page editor (`/notes/:id`)

Added after the #300 review: the library IA above was accepted, the drawer editor was not. A note
is now a first-class editable page. Same visual language — teal/orange, Fira Sans/Fira Code, flat
surfaces, lucide icons, Tracker components. Notion-like *interaction quality*, not a Notion clone.

## 8. Research run for the editor

Transcript: `../research/tool-transcripts/06-note-page-editor-299.md` (17 searches). The three
results that actually shaped the design:

| Tool result | Applied as |
|---|---|
| `ux` Accessibility → **Dragging Movements** (High): *"Add buttons, menus or tap-to-move controls and retain keyboard operation. Don't make dragging the only way to reorder"* | The drag handle is a convenience. Every reorder is also a `Move up`/`Move down` command in the block menu, which is keyboard reachable. Dragging is never the only path. |
| `ux` Interaction → **Compact Control Semantics** (Critical): *"Prefer a button and expose pressed or selected state. Don't use a clickable div **or reveal the only action on hover**"* | Gutter controls (insert, drag, block menu) fade in on hover/focus but are always in the DOM, always focusable, and every action they offer also lives in the block menu. Opacity-only reveal, so nothing reflows. |
| `ux` Layout → **Content Jumping** (High) and Typography → **Text Reflow and Spacing** (Critical): *"content-driven height; don't clip text in fixed-height boxes"* | Blocks are auto-growing textareas — no fixed-height boxes, no inner scrollbars. The save indicator sits in a fixed-width slot so `Saving… → Saved` cannot reflow the header. |

Also applied: **Hover vs Tap** (don't rely on hover for important actions), **Input Labels** (the
title has an `sr-only` label; every block has one naming its type and position), **Focus States**,
**Touch Target Size**, **Back Button** (the `?return=` contract below).

Two icon queries returned **no match** for a drag handle. Per SKILL.md's zero-result rule this is
recorded as *no verified match*: lucide `GripVertical` was chosen from the app's existing family as
a documented fallback, not presented as a tool recommendation.

## 9. Why textareas, not `contentEditable`

The backend stores each block's content as **plain text** (`note_blocks.content`), and the note's
`body` as a flat string. There is no inline-span model anywhere in the schema. A `contentEditable`
surface would let users apply bold/italic/links that **cannot be persisted** — the classic lossy
rich-text trap. So each block is a borderless auto-growing `<textarea>`: visually identical to a
Notion block, exact round-trip with what the API can actually store, and reliable caret semantics
for the Enter/Backspace model.

**Inline formatting is therefore deliberately not shipped.** A selection toolbar offering bold and
italic would either silently discard formatting on reload or smuggle markdown into `PLAIN_TEXT`
notes. Block-level transforms (`Turn into` heading/bullet/checklist/quote/code) *are* offered,
because those persist as `note_blocks.type`. Real inline formatting needs a backend rich-text model
and is a separate proposal, not something to fake here.

## 10. Keyboard model

| Key | Behaviour |
|---|---|
| `Enter` | Splits at the caret; text after the caret becomes a new block and takes focus. Lists continue their own type; everything else drops to a paragraph. On an already-empty list/checklist/quote block it **exits the list** instead of stacking empty items. Shift+Enter and Enter inside a code block insert a newline. |
| `Backspace` at offset 0 | Merges into the previous block and restores the caret to the join point. A decorated empty block first reverts to a paragraph (one press to undo the type, a second to remove). The first block is never removed — the document always has somewhere to type. |
| `ArrowUp` / `ArrowDown` | At the first/last position, moves to the adjacent block. |
| `/` | Opens the command palette anchored to the block. While open it consumes `ArrowUp`, `ArrowDown`, `Enter`, `Tab`, `Escape`. The caret never leaves the text field — the palette is a controlled `listbox` driven from the field's key handler, with the highlight owned by the block. |

## 11. Autosave and version history

Answers to the review's seven questions, and the design that follows from them:

- **Every update creates a version?** No — `shouldCreateVersion` already debounced. But title,
  content-type, tag, or ≥120-char body changes bypassed the debounce and always snapshotted.
- **Would naive autosave flood history?** Yes — typing a title is "major" on every keystroke
  batch, so a 20-minute session would mint 50+ versions.
- **Atomic with blocks?** Now yes: `blocks` is a field on `UpdateNoteRequest`, so note and blocks
  commit in one transaction rather than two racing requests.
- **Overlapping saves / optimistic concurrency / stale responses / failure?** No `@Version`, no
  ETag; last-write-wins. Handled client-side, see below.

**Client:** 900 ms debounce · strictly one request in flight (a save during a save is queued as a
single latest snapshot, never a second concurrent request) · every save carries the local revision
it was built from, and a response may only mark *that* revision clean · the editor adopts **block
ids only** from a response, never content, so an in-flight save cannot clobber what was typed
while it was open · `Saved` appears only after a confirmed 2xx · failure is a persistent
`role="alert"` with Retry and the document stays dirty · pending work is flushed before the Back
link navigates, and `beforeunload` warns.

**Server:** autosaves send `autosave: true`, which makes the version rule use *only* the existing
2-minute debounce. Explicit saves, restores and templates keep today's behaviour exactly. Content
is saved every time; only snapshot frequency changes — so history keeps representing meaningful
recoverable states instead of keystrokes.

**Known limit, stated rather than papered over:** this protects one editor against its own races.
Two devices editing the same note concurrently remain last-write-wins. Real optimistic locking
would need a schema migration and 409 UX — a bigger change than this issue should carry.

**Restore is not a save, and must not be treated as one.** `mutate()` returns before the request
is sent, so re-hydrating straight after it reads back the *pre-restore* note and pins it as the
editor's baseline — the page then shows the old document even though the restore succeeded. The
rule: await the restore, await the note refetch, and only then change `hydrationKey`. A failed
restore changes nothing on screen and surfaces the server's own message in a `role="alert"`. The
re-hydration that follows a successful restore arrives with a new baseline key, so autosave adopts
it as clean rather than saving it straight back.

## 12. Navigation contract

Opening a note from the library carries the live filter query string as `?return=`. The Back link
flushes any pending save and returns to `/notes?<that query>` — same smart view, same project,
same search. `/notes/new` creates the record on the first edit and `replace()`s the URL to the real
id, so no dead `/notes/new` entry sits between the library and the note in history.

## 13. Mobile

No permanent sidebar. Title and content take the full width. Properties collapse to a single
wrapping line and expand in place. Gutter controls appear for the focused block (touch = focus),
and every action they offer is also in the block menu, which is a normal tap target. Verified at
375 / 768 / 1440 in light and dark with zero horizontal page overflow.
