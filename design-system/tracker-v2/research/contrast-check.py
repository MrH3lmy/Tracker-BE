#!/usr/bin/env python3
"""WCAG contrast verifier for the Tracker v2 "Neutral Workbench" foundation.

Run:  python3 design-system/tracker-v2/research/contrast-check.py

Thresholds:
  * text pairs            >= 4.5:1  (WCAG 2.2 AA, 1.4.3 normal text)
  * component boundaries  >= 3.0:1  (WCAG 2.2 AA, 1.4.11 non-text contrast)
  * focus ring vs surface >= 3.0:1  (WCAG 2.2 AA, 1.4.11)

`line` is a decorative divider and is deliberately exempt from 1.4.11; every
boundary that *identifies* a control uses `line_control`, which is checked.
"""
import sys


def _lum(hex_color: str) -> float:
    h = hex_color.lstrip('#')
    channels = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def ratio(a: str, b: str) -> float:
    la, lb = _lum(a), _lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


NEUTRAL_LIGHT = dict(
    canvas='#F8FAFC', card='#FFFFFF', inset='#F1F5F9', raised='#FFFFFF',
    fg='#0F172A', fg_muted='#475569', fg_subtle='#64748B',
    line='#E2E8F0', line_strong='#CBD5E1', line_control='#7C8BA1',
    positive='#15803D', caution='#B45309', critical='#DC2626', neutral='#475569',
)
NEUTRAL_DARK = dict(
    canvas='#0B1120', card='#0F172A', inset='#1E293B', raised='#1E293B',
    fg='#F1F5F9', fg_muted='#94A3B8', fg_subtle='#7D8FA6',
    line='#1E293B', line_strong='#334155', line_control='#64748B',
    positive='#4ADE80', caution='#FBBF24', critical='#F87171', neutral='#94A3B8',
)

# Every theme is the same neutral chrome with a different accent hue. Colour is
# spent on action and state, never on the chrome itself.
THEMES = {
    'light':  (NEUTRAL_LIGHT, dict(brand='#2563EB', brand_hover='#1D4ED8', brand_soft='#EFF6FF', brand_fg='#FFFFFF')),
    'dark':   (NEUTRAL_DARK,  dict(brand='#60A5FA', brand_hover='#93C5FD', brand_soft='#172554', brand_fg='#0B1120')),
    'aurora': (NEUTRAL_DARK,  dict(brand='#A78BFA', brand_hover='#C4B5FD', brand_soft='#1E1B4B', brand_fg='#0B1120')),
    'ocean':  (NEUTRAL_LIGHT, dict(brand='#0E7490', brand_hover='#155E75', brand_soft='#ECFEFF', brand_fg='#FFFFFF')),
    'forest': (NEUTRAL_LIGHT, dict(brand='#15803D', brand_hover='#166534', brand_soft='#F0FDF4', brand_fg='#FFFFFF')),
}

TEXT_PAIRS = [
    ('fg', 'canvas'), ('fg', 'card'), ('fg', 'inset'), ('fg', 'raised'),
    ('fg_muted', 'canvas'), ('fg_muted', 'card'), ('fg_muted', 'inset'),
    ('fg_subtle', 'canvas'), ('fg_subtle', 'card'),
    ('brand', 'canvas'), ('brand', 'card'), ('brand', 'brand_soft'),
    ('brand_fg', 'brand'), ('brand_fg', 'brand_hover'),
    ('positive', 'canvas'), ('positive', 'card'),
    ('caution', 'canvas'), ('caution', 'card'),
    ('critical', 'canvas'), ('critical', 'card'),
    ('neutral', 'canvas'), ('neutral', 'card'),
]
# 1.4.11: control boundaries and the focus ring must stand off every surface
# they can appear on.
NON_TEXT_PAIRS = [
    ('line_control', 'canvas'), ('line_control', 'card'), ('line_control', 'inset'),
    ('brand', 'canvas'), ('brand', 'card'), ('brand', 'inset'),
]


def main() -> int:
    failures = 0
    for theme, (neutrals, accent) in THEMES.items():
        palette = {**neutrals, **accent}
        print(f'\n=== {theme} ===')
        print('  text (>= 4.5:1)')
        for fg, bg in TEXT_PAIRS:
            r = ratio(palette[fg], palette[bg])
            ok = r >= 4.5
            failures += not ok
            print(f"    {'PASS' if ok else 'FAIL'}  {r:5.2f}:1  {fg:12s} on {bg}")
        print('  non-text: control boundary + focus ring (>= 3:1)')
        for fg, bg in NON_TEXT_PAIRS:
            r = ratio(palette[fg], palette[bg])
            ok = r >= 3.0
            failures += not ok
            print(f"    {'PASS' if ok else 'FAIL'}  {r:5.2f}:1  {fg:12s} on {bg}")

    print(f"\n{'ALL PASS' if not failures else f'{failures} FAILURE(S)'}")
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
