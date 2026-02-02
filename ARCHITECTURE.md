# Architecture Notes

## UI Theming Conventions

- Prefer theme-scoped utilities and classes over one-off `sx` for shared styling.
- Use `sx` for structural layout (grids, flow, positioning); use theme for visual styling (typography, spacing, color).
- Use `.ui-panel` to opt into panel-wide typography sizing.
- Use `.ui-panel-title` / `.ui-panel-title-compact` for panel headings.
- Use `.ui-muted` for standard secondary text.
- Use `.ui-tip` / `.ui-tip-compact` for tip/helper text (muted + smaller size).
- `.ui-tip-compact-nav` is reserved for nav key hints.
- `Typography` `caption` is muted by default in the theme.
- `CommandButton` layout → classes:
  - `inline` → `ui-cmd-inline` (and `inlineCompact` on mobile → `ui-cmd-inline-compact`).
  - `stacked` → `ui-cmd-stacked`.
  - `compact` → `ui-cmd-compact`.
  - Nav buttons (N/S/E/W/U/D/X) also add `ui-nav-button`, and use `ui-tip-compact-nav` for key hints.
- CommandButton sizing (minWidth, padding, letterSpacing, fontSize) is theme-controlled via `ui-cmd-*` / `ui-nav-button` classes.
- Key hints are hidden on mobile for inline/stacked layouts; compact buttons still show the key since it's the button label.

## Composition Preferences

- Keep view logic in a model hook (e.g., `useSetupGameModel`), and keep UI components mostly presentational.
- When a shared pattern emerges, extract it once and reuse it (avoid duplicating `sx` blocks).

## One-off Styling

- Default to theming; confirm before introducing screen-specific tweaks that could spread.
