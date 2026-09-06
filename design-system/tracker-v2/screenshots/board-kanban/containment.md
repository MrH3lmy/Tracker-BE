# Board containment — browser assertions

Proves the board never scrolls sideways, never clips a column, and never shows a
partial "peek" column — at every target breakpoint, and for every column count
the backend might configure.

Driven by Playwright against the real frontend build. Each run reconfigures the
number of board columns the API serves, so the layout is exercised the way the
backend actually varies it.

## What each run asserts

| Assertion | How |
|---|---|
| No horizontal **page** overflow | `document.documentElement.scrollWidth <= clientWidth` |
| The **board** is not a horizontal scroller | `grid.scrollWidth <= grid.clientWidth` on the column grid |
| Every configured column is rendered together | count of `role="region"` column landmarks equals the configured count |
| The rightmost column is fully visible | its `getBoundingClientRect().right <= viewport width` |
| Columns stay usable, not shrunk to fit | narrowest rendered column `>= 200px` |
| The rightmost column's controls are reachable | its first Move/Drag control's right edge is inside the viewport |
| Narrow widths fall back rather than scroll | single-column mode renders, with the column switcher present |
| Resizing introduces no overflow | re-asserted after resizing to viewport ±, in both directions |

## Result

```
### 3 configured columns
PASS  3 cols @ 1440: no horizontal page overflow — document scrollWidth 1440 <= clientWidth 1440
PASS  3 cols @ 1440: board does not scroll horizontally — board scrollWidth 1176 <= clientWidth 1176
PASS  3 cols @ 1440: all 3 columns rendered together — 3 column regions, tracks: 392px 392px 392px
PASS  3 cols @ 1440: rightmost column fully visible — rightmost right edge 1428.0 <= viewport 1440
PASS  3 cols @ 1440: narrowest column still usable — narrowest 392.0px
PASS  3 cols @ 1440: rightmost column controls reachable — control right edge 1365.0
PASS  3 cols @ 1440: no overflow after resize to 1320 — 1320 <= 1320
PASS  3 cols @ 1440: no overflow after resize to 1600 — 1600 <= 1600
PASS  3 cols @ 1024: no horizontal page overflow — document scrollWidth 1024 <= clientWidth 1024
PASS  3 cols @ 1024: board does not scroll horizontally — board scrollWidth 760 <= clientWidth 760
PASS  3 cols @ 1024: all 3 columns rendered together — 3 column regions, tracks: 253.328px 253.328px 253.328px
PASS  3 cols @ 1024: rightmost column fully visible — rightmost right edge 1012.0 <= viewport 1024
PASS  3 cols @ 1024: narrowest column still usable — narrowest 253.3px
PASS  3 cols @ 1024: rightmost column controls reachable — control right edge 949.0
PASS  3 cols @ 1024: no overflow after resize to 904 — 904 <= 904
PASS  3 cols @ 1024: no overflow after resize to 1184 — 1184 <= 1184
PASS  3 cols @ 768: no horizontal page overflow — document scrollWidth 768 <= clientWidth 768
PASS  3 cols @ 768: board does not scroll horizontally — board scrollWidth 668 <= clientWidth 668
PASS  3 cols @ 768: single-column mode with a switcher — 1 column region rendered
PASS  3 cols @ 768: no overflow after resize to 648 — 648 <= 648
PASS  3 cols @ 768: no overflow after resize to 928 — 928 <= 928
PASS  3 cols @ 375: no horizontal page overflow — document scrollWidth 375 <= clientWidth 375
PASS  3 cols @ 375: board does not scroll horizontally — board scrollWidth 367 <= clientWidth 367
PASS  3 cols @ 375: single-column mode with a switcher — 1 column region rendered
PASS  3 cols @ 375: no overflow after resize to 320 — 320 <= 320
PASS  3 cols @ 375: no overflow after resize to 535 — 535 <= 535

26/26 checks passed

### 4 configured columns
PASS  4 cols @ 1440: no horizontal page overflow — document scrollWidth 1440 <= clientWidth 1440
PASS  4 cols @ 1440: board does not scroll horizontally — board scrollWidth 1176 <= clientWidth 1176
PASS  4 cols @ 1440: all 4 columns rendered together — 4 column regions, tracks: 294px 294px 294px 294px
PASS  4 cols @ 1440: rightmost column fully visible — rightmost right edge 1428.0 <= viewport 1440
PASS  4 cols @ 1440: narrowest column still usable — narrowest 294.0px
PASS  4 cols @ 1440: rightmost column controls reachable — control right edge 1365.0
PASS  4 cols @ 1440: no overflow after resize to 1320 — 1320 <= 1320
PASS  4 cols @ 1440: no overflow after resize to 1600 — 1600 <= 1600
PASS  4 cols @ 1024: no horizontal page overflow — document scrollWidth 1024 <= clientWidth 1024
PASS  4 cols @ 1024: board does not scroll horizontally — board scrollWidth 760 <= clientWidth 760
PASS  4 cols @ 1024: single-column mode with a switcher — 1 column region rendered
PASS  4 cols @ 1024: no overflow after resize to 904 — 904 <= 904
PASS  4 cols @ 1024: no overflow after resize to 1184 — 1184 <= 1184
PASS  4 cols @ 768: no horizontal page overflow — document scrollWidth 768 <= clientWidth 768
PASS  4 cols @ 768: board does not scroll horizontally — board scrollWidth 668 <= clientWidth 668
PASS  4 cols @ 768: single-column mode with a switcher — 1 column region rendered
PASS  4 cols @ 768: no overflow after resize to 648 — 648 <= 648
PASS  4 cols @ 768: no overflow after resize to 928 — 928 <= 928
PASS  4 cols @ 375: no horizontal page overflow — document scrollWidth 375 <= clientWidth 375
PASS  4 cols @ 375: board does not scroll horizontally — board scrollWidth 367 <= clientWidth 367
PASS  4 cols @ 375: single-column mode with a switcher — 1 column region rendered
PASS  4 cols @ 375: no overflow after resize to 320 — 320 <= 320
PASS  4 cols @ 375: no overflow after resize to 535 — 535 <= 535

23/23 checks passed

### 5 configured columns
PASS  5 cols @ 1440: no horizontal page overflow — document scrollWidth 1440 <= clientWidth 1440
PASS  5 cols @ 1440: board does not scroll horizontally — board scrollWidth 1176 <= clientWidth 1176
PASS  5 cols @ 1440: all 5 columns rendered together — 5 column regions, tracks: 235.188px 235.203px 235.203px 235.203px 235.188px
PASS  5 cols @ 1440: rightmost column fully visible — rightmost right edge 1428.0 <= viewport 1440
PASS  5 cols @ 1440: narrowest column still usable — narrowest 235.2px
PASS  5 cols @ 1440: rightmost column controls reachable — column empty, nothing to reach
PASS  5 cols @ 1440: no overflow after resize to 1320 — 1320 <= 1320
PASS  5 cols @ 1440: no overflow after resize to 1600 — 1600 <= 1600
PASS  5 cols @ 1024: no horizontal page overflow — document scrollWidth 1024 <= clientWidth 1024
PASS  5 cols @ 1024: board does not scroll horizontally — board scrollWidth 760 <= clientWidth 760
PASS  5 cols @ 1024: single-column mode with a switcher — 1 column region rendered
PASS  5 cols @ 1024: no overflow after resize to 904 — 904 <= 904
PASS  5 cols @ 1024: no overflow after resize to 1184 — 1184 <= 1184
PASS  5 cols @ 768: no horizontal page overflow — document scrollWidth 768 <= clientWidth 768
PASS  5 cols @ 768: board does not scroll horizontally — board scrollWidth 668 <= clientWidth 668
PASS  5 cols @ 768: single-column mode with a switcher — 1 column region rendered
PASS  5 cols @ 768: no overflow after resize to 648 — 648 <= 648
PASS  5 cols @ 768: no overflow after resize to 928 — 928 <= 928
PASS  5 cols @ 375: no horizontal page overflow — document scrollWidth 375 <= clientWidth 375
PASS  5 cols @ 375: board does not scroll horizontally — board scrollWidth 367 <= clientWidth 367
PASS  5 cols @ 375: single-column mode with a switcher — 1 column region rendered
PASS  5 cols @ 375: no overflow after resize to 320 — 320 <= 320
PASS  5 cols @ 375: no overflow after resize to 535 — 535 <= 535

23/23 checks passed

```

## Reading the result

The fallback point moves with the column count, which is the whole reason this
is a measurement rather than a media query:

| Configured columns | 1440 | 1024 | 768 | 375 |
|---|---|---|---|---|
| 3 | all three (392px each) | all three (253px each) | single | single |
| 4 | all four (294px each) | single | single | single |
| 5 | all five (235px each) | single | single | single |

At 1024 a three-column board still fits while a five-column board does not — the
same viewport, a different answer. No CSS breakpoint can express that.
