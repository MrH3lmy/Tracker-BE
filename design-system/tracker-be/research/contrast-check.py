#!/usr/bin/env python3
"""WCAG 2.1 contrast ratio verification for the palette in styles/theme.css light/dark
[data-theme] blocks. Run: python3 contrast-check.py
Every pair printed here was checked before the corresponding --app-* value was chosen;
see MASTER.md's "On Primary: #000000" spec, which is what led to using black text on
the bright dark-mode teal instead of white.
"""

def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def lum(hex_):
    hex_ = hex_.lstrip('#')
    r, g, b = int(hex_[0:2], 16), int(hex_[2:4], 16), int(hex_[4:6], 16)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contrast(a, b):
    la, lb = lum(a), lum(b)
    lighter, darker = max(la, lb), min(la, lb)
    return (lighter + 0.05) / (darker + 0.05)

LIGHT = [
    ("brand text on white", "#0F766E", "#FFFFFF"),
    ("white text on brand button", "#FFFFFF", "#0F766E"),
    ("positive on white", "#047857", "#FFFFFF"),
    ("caution on white", "#9A3412", "#FFFFFF"),
    ("critical on white", "#B91C1C", "#FFFFFF"),
    ("fg (teal ink) on canvas", "#134E4A", "#F0FDFA"),
    ("fg-muted on canvas", "#475569", "#F0FDFA"),
    ("brand on brand-soft (badge)", "#0F766E", "#CCFBF1"),
    ("positive on positive-soft (badge)", "#047857", "#D1FAE5"),
    ("caution on caution-soft (badge)", "#9A3412", "#FFEDD5"),
    ("critical on critical-soft (badge)", "#B91C1C", "#FEE2E2"),
]

DARK = [
    ("brand text on dark card", "#14B8A6", "#101A19"),
    ("black text on brand button (On Primary spec)", "#04120F", "#14B8A6"),
    ("positive on dark card", "#34D399", "#101A19"),
    ("caution on dark card", "#FB923C", "#101A19"),
    ("critical on dark card", "#F87171", "#101A19"),
    ("fg on canvas", "#ECFEFF", "#071211"),
    ("fg-muted on canvas", "#9FB4B1", "#071211"),
]

if __name__ == "__main__":
    print("-- light theme --")
    for name, a, b in LIGHT:
        ratio = contrast(a, b)
        print(f"{name}: {ratio:.2f}:1 {'PASS' if ratio >= 4.5 else 'FAIL'}")
    print("\n-- dark theme --")
    for name, a, b in DARK:
        ratio = contrast(a, b)
        print(f"{name}: {ratio:.2f}:1 {'PASS' if ratio >= 4.5 else 'FAIL'}")
