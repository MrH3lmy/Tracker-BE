# Tracker design system — v2

**`MASTER.md` in this directory is the active source of truth for all Tracker UI work.**

## Layout

| Path | Contents |
|---|---|
| `MASTER.md` | The design foundation: principles, density, type, colour, shell, motion, a11y, anti-patterns |
| `research/00-method.md` | How the UI UX Pro Max research was run, what was rejected, and why |
| `research/01..16-*.md` | Verbatim `search.py` transcripts |
| `research/skill-output/MASTER.md` | Raw `--design-system --persist` output, unmodified |
| `research/contrast-check.py` | Executable WCAG verifier for every theme |
| `pages/` | Per-surface overrides (created as later roadmap issues land) |

## Relationship to `design-system/tracker-be/`

`design-system/tracker-be/` is the previous system ("Cockpit"). It is **historical
reference only** and is deliberately left unchanged — v2 was created as a new
versioned artifact rather than by editing the old master in place.

Consult it only to inventory functionality that must not be lost. Do not consult
it for design decisions: none of its values carry over, and re-deriving from it
is what #308 exists to prevent.

## Verifying a change

```bash
# any colour change
python3 design-system/tracker-v2/research/contrast-check.py

# from frontend/
npm run lint && npm run test && npm run build
```

Then check the surface at 375 / 768 / 1024 / 1440, in light and dark, keyboard-only.
