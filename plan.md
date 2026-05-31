# Plan: Build Gnomeethyst

Date: 2026-05-31

Project name: `Gnomeethyst`

Package name: `gnomeethyst`

Project location: repository root

Local extension UUID: `gnomeethyst@local`

Target machine: Fedora GNOME, currently GNOME Shell 50.1

Personal macOS reference inspected:

- `mmv08/dotfiles-macos` at `d3695feff2190e1fafc6fc508378817adc13d65b`
- Amethyst config: `dotfiles-macos/.amethyst.yml`
- Custom layouts: `dotfiles-macos/dotfiles-meta/amethyst/Layouts/`

## Decision

Build our own focused GNOME Shell extension.

The goal is not to make a general tiling platform. The goal is to make GNOME feel like Amethyst where it matters:

- choose `Tall`, `Wide`, `Column`, or `Fullscreen`
- windows automatically reflow when they appear, disappear, switch workspaces, or when the layout changes
- keep Amethyst muscle-memory keybindings
- stay inside the normal GNOME session instead of switching to xmonad, i3, sway, or a custom compositor

Your current Amethyst setup is intentionally small:

- `mod1`: `control + option`
- `mod2`: `control + option + shift`
- layout cycle: `tall`, `fullscreen`, `wide`, `column`, `3column-mid-focus`, `5column-middle`
- custom layouts are symlinked into `~/Library/Application Support/Amethyst/Layouts`

## Tech Stack

Use the native GNOME Shell extension stack:

- Runtime: GNOME Shell extension using GJS.
- Language: TypeScript compiled to JavaScript ES modules.
- Build: `esbuild`.
- GNOME types: `@girs/gjs` and `@girs/gnome-shell`.
- Tests: Node's built-in `node:test` runner for pure layout logic.
- Settings: GSettings schema through `Gio.Settings`.
- Shell UI: GNOME Shell `St` widgets for a tiny panel indicator.
- Preferences UI: defer at first; later use `prefs.ts` with GTK/libadwaita if needed.
- Package/install: `gnome-extensions pack`, local install into `~/.local/share/gnome-shell/extensions/<uuid>`, plus `glib-compile-schemas`.

Version baseline checked on 2026-05-31:

- Local Node: `v24.16.0`
- `typescript`: `6.0.3`
- `esbuild`: `0.28.0`
- `@girs/gjs`: `4.0.4`
- `@girs/gnome-shell`: `50.0.0`

Before scaffolding, re-check those with `npm view <package> version` and use the latest compatible versions. Commit the lockfile after install so the project is reproducible.

Why this stack:

- GNOME Shell extensions are written for GJS, so this is the least surprising runtime.
- TypeScript gives autocomplete and keeps the layout/state code saner.
- The layout engine can be pure TypeScript and tested outside GNOME Shell.
- We avoid React, Electron, GTK app scaffolding, test-runner frameworks, or any separate daemon.

## Dependency Policy

Keep runtime dependencies at zero. Gnomeethyst should run on GNOME Shell APIs and code we own.

Allowed dev-only dependencies:

- `typescript@latest`
- `esbuild@latest`
- `@girs/gjs@latest`
- `@girs/gnome-shell@latest`

Potential dev-only dependency:

- `@types/node@latest`, only if TypeScript tests need Node API typings.

Do not add a dependency unless it removes more complexity than it adds. Avoid UI frameworks, utility libraries, YAML parsers, state-management libraries, animation libraries, and custom test frameworks until there is a specific, demonstrated need.

## Complexity Guardrails

Prefer the smallest design that preserves the Amethyst workflow.

Complexity is allowed when it pays for itself. If a nice UI becomes important, build it with the simplest GNOME-native approach that gets the experience right instead of avoiding UI on principle.

- Keep layout math pure and boring.
- Keep GNOME-specific code thin.
- Add settings only when a value must survive restarts or be user-configurable.
- Add UI only when a keybinding is not enough.
- Add abstractions only after two or three real call sites prove the shape.
- Prefer rebuilding state from GNOME's current windows over maintaining elaborate caches.
- Do not support external layout plugins in the MVP; port your known custom layouts as normal TypeScript modules.
- Do not add animations until the no-animation behavior is reliable.

Useful official references:

- GNOME extension guide: https://gjs.guide/extensions/
- Extension anatomy: https://gjs.guide/extensions/overview/anatomy.html
- Creating extensions: https://gjs.guide/extensions/development/creating.html
- TypeScript for GNOME extensions: https://gjs.guide/extensions/development/typescript.html
- GJS API docs: https://gjs-docs.gnome.org/gjs/
- GNOME Shell 50 upgrade notes: https://gjs.guide/extensions/upgrading/gnome-shell-50.html

## Product Scope

### Core Layouts

Implement these first:

- `Tall`
- `Fullscreen`
- `Wide`
- `Column`

These should appear in your real Amethyst cycle order:

1. `Tall`
2. `Fullscreen`
3. `Wide`
4. `Column`

Implement immediately after the core layouts because they are part of your real setup:

- `3ColumnMidFocus`
- `5ColumnMiddle`

Add later:

- `Row`
- `TallRight`
- `TwoPane`
- `3Column-*`
- `WidescreenTall`
- `BSP`

### MVP Commands

Implement the commands that make Amethyst feel like Amethyst:

- cycle layout forward/backward
- select `Tall`
- select `Wide`
- select `Column`
- select `Fullscreen`
- shrink/expand main pane
- increase/decrease main pane count
- focus previous/next managed window
- swap previous/next managed window
- swap focused window with main
- toggle float for focused window
- toggle tiling globally
- reflow all windows
- show current layout name

### MVP Keybindings

Map Amethyst modifiers to GNOME:

- Amethyst `control + option` -> GNOME `<Control><Alt>`
- Amethyst `control + option + shift` -> GNOME `<Control><Alt><Shift>`

Initial bindings:

| Command | GNOME Binding |
| --- | --- |
| Cycle layout forward | `<Control><Alt>space` |
| Cycle layout backward | `<Control><Alt><Shift>space` |
| Select Tall | `<Control><Alt>a` |
| Select Wide | `<Control><Alt>s` |
| Select Fullscreen | `<Control><Alt>d` |
| Select Column | `<Control><Alt>f` |
| Shrink main pane | `<Control><Alt>h` |
| Expand main pane | `<Control><Alt>l` |
| Increase main pane count | `<Control><Alt>comma` |
| Decrease main pane count | `<Control><Alt>period` |
| Focus previous | `<Control><Alt>j` |
| Focus next | `<Control><Alt>k` |
| Swap previous | `<Control><Alt><Shift>j` |
| Swap next | `<Control><Alt><Shift>k` |
| Swap focused with main | `<Control><Alt>Return` |
| Toggle float | `<Control><Alt>t` |
| Toggle tiling | `<Control><Alt><Shift>t` |
| Reflow | `<Control><Alt>z` |
| Display layout | `<Control><Alt>i` |

Potential conflict: some desktop or terminal shortcuts use `Ctrl+Alt`. If a conflict appears, keep the extension configurable through GSettings, but default to your real Amethyst config.

## Personal Amethyst Compatibility

Your dotfiles contain a minimal `.amethyst.yml`:

```yaml
mod1:
  - control
  - option

mod2:
  - control
  - option
  - shift

layouts:
  - tall
  - fullscreen
  - wide
  - column
  - 3column-mid-focus
  - 5column-middle
```

The GNOME extension should treat this as the source of truth for defaults.

### Custom Layout: `3column-mid-focus`

Port `dotfiles-macos/dotfiles-meta/amethyst/Layouts/3column-mid-focus.js`.

Behavior:

- first window is the main window
- main window sits in the center column
- default center width ratio is `0.62`
- remaining windows alternate between left and right side columns
- each side column stacks its assigned windows vertically
- on screens narrower than `1400px`, it falls back to a simpler main-left/side-right split with main width `0.55`

This should become a built-in TypeScript layout named `3ColumnMidFocus`, not a runtime JavaScript plugin in MVP.

### Custom Layout: `5column-middle`

Port `dotfiles-macos/dotfiles-meta/amethyst/Layouts/5column-middle.js`.

Behavior:

- first window is the main window
- main window sits in the center column
- column ratios:
  - outer left: `0.13`
  - inner left: `0.20`
  - main: `0.34`
  - inner right: `0.20`
  - outer right: `0.13`
- remaining windows fill near-center first:
  - inner left
  - inner right
  - outer left
  - outer right
  - repeat
- each column stacks its assigned windows vertically

This layout is clearly tuned for ultrawide use. It should be implemented soon after the first four layouts because it represents actual daily workflow, not hypothetical polish.

### Dotfiles Integration

Do not add YAML parsing inside GNOME Shell for MVP.

Instead:

- encode your current `.amethyst.yml` values as GSettings defaults
- add a repo script later that can read `.amethyst.yml` at build/dev time and update schema defaults or a generated TypeScript defaults file
- keep custom layouts as normal TypeScript modules so they are testable

The macOS install script symlinks custom layouts into Amethyst. The GNOME equivalent should eventually be:

```bash
npm run install:extension
gnome-extensions enable gnomeethyst@local
```

No separate layout symlink step should be required for GNOME.

## Architecture

### Directory Shape

```text
package.json
tsconfig.json
esbuild.mjs
metadata.json
schemas/
  org.gnome.shell.extensions.gnomeethyst.gschema.xml
src/
  extension.ts
  prefs.ts
  keybindings.ts
  settings.ts
  state/
    workspaceState.ts
    windowOrder.ts
  shell/
    windowTracker.ts
    reflowController.ts
    frameApplier.ts
    panelIndicator.ts
    windowFilters.ts
  layouts/
    types.ts
    tall.ts
    fullscreen.ts
    wide.ts
    column.ts
    threeColumnMidFocus.ts
    fiveColumnMiddle.ts
    registry.ts
  tests/
    tall.test.ts
    fullscreen.test.ts
    wide.test.ts
    column.test.ts
    threeColumnMidFocus.test.ts
    fiveColumnMiddle.test.ts
```

### Core Design

Separate the project into two layers.

The pure layout layer:

- takes an ordered list of windows
- takes a work area rectangle
- takes layout state like main pane ratio/count
- returns desired rectangles
- has no GNOME imports
- is unit-tested with Node's built-in test runner

The GNOME shell layer:

- tracks `Meta.Window` objects
- filters windows that should not be tiled
- tracks monitor/workspace state
- registers keybindings
- calls the layout engine
- applies frames through Mutter/GNOME APIs

Core layout API:

```ts
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ManagedWindow = {
  id: string;
  isFocused: boolean;
};

export type LayoutState = {
  mainPaneRatio: number;
  mainPaneCount: number;
};

export interface DynamicLayout {
  key: string;
  name: string;
  assign(
    windows: ManagedWindow[],
    workArea: Rect,
    state: LayoutState,
  ): Map<string, Rect>;
}
```

### Window Tracking

Track managed windows per workspace and monitor:

```ts
type ScopeKey = `${workspaceIndex}:${monitorIndex}`;

type ScopeState = {
  layoutKey:
    | "tall"
    | "fullscreen"
    | "wide"
    | "column"
    | "3column-mid-focus"
    | "5column-middle";
  mainPaneRatio: number;
  mainPaneCount: number;
  orderedWindowIds: string[];
  floatingWindowIds: string[];
};
```

Start with workspace index because it is simple and good enough for the first version. If workspace identity gets weird across dynamic workspace changes, evolve to a stronger key later.

### Window Filters

Tile only windows that pass conservative filters:

- `Meta.WindowType.NORMAL`
- not minimized
- not a transient dialog
- not an attached dialog
- not override-redirect
- not skip-taskbar if that turns out to catch utility windows correctly
- not explicitly floated by the user

Dialogs, app popups, file pickers, screen sharing windows, and tiny utility windows should float.

### Reflow Triggers

Call reflow when:

- extension enables
- a normal window is created
- a managed window is unmanaged/destroyed
- a window is minimized or unminimized
- active workspace changes
- monitor/workarea changes
- current layout changes
- main pane ratio/count changes
- windows are swapped
- user presses manual reflow

Use a short debounce, roughly 50-100 ms, because GNOME often emits several signals for one visible event.

### Frame Application

For each managed window:

1. unmaximize if needed
2. compute gap-adjusted destination rectangle
3. call `move_resize_frame(false, x, y, width, height)`
4. avoid animations in MVP
5. keep a guard so our own moves do not trigger runaway reflows

Add animations later only if the MVP feels solid.

## Layout Behavior

### Tall

Main pane on the left.

- If there is one managed window, it gets the full work area.
- Otherwise, first `mainPaneCount` windows occupy the left pane.
- Remaining windows stack vertically in the right pane.
- Main pane width is controlled by `mainPaneRatio`.

### Wide

Main pane on the top.

- If there is one managed window, it gets the full work area.
- First `mainPaneCount` windows occupy the top pane.
- Remaining windows split the bottom pane horizontally.
- Main pane height is controlled by `mainPaneRatio`.

### Column

One full-height column per window.

- First `mainPaneCount` windows occupy the main area.
- Remaining windows split the secondary area.
- For the default Amethyst feel, start with `mainPaneCount = 1` and `mainPaneRatio = 0.5`.

### Fullscreen

Focused window gets the full work area.

Initial MVP can either:

- move every managed window to the full work area and raise/focus the active window, or
- only reflow/focus the active window and leave others untouched.

Prefer the first option only if it does not cause focus or stacking weirdness. Otherwise keep Fullscreen minimal.

### 3Column Mid Focus

Center-focused layout from your dotfiles.

- screen width below `1400px`: use main-left/side-right fallback
- screen width `1400px` and above: use left/center/right columns
- main column ratio: `0.62`
- side columns split remaining width evenly
- first window goes to center
- remaining windows alternate left/right
- side columns stack vertically

### 5Column Middle

Ultrawide layout from your dotfiles.

- fixed left-to-right ratios: `0.13`, `0.20`, `0.34`, `0.20`, `0.13`
- first window goes to center
- remaining windows distribute to `innerLeft`, `innerRight`, `outerLeft`, `outerRight`
- each column stacks vertically

## Build Milestones

### Milestone 0: Skeleton

Deliverable:

- extension loads on GNOME Shell 50.1
- panel indicator appears
- enable/disable cleanly
- local build/install scripts work
- `package.json` has no runtime dependencies and only approved dev dependencies

Acceptance:

- no errors in `journalctl --follow /usr/bin/gnome-shell`
- disabling extension unregisters keybindings and removes indicator
- `npm ls --omit=dev` shows no third-party runtime packages

### Milestone 1: Pure Layout Engine

Deliverable:

- `Tall`, `Fullscreen`, `Wide`, `Column`
- unit tests for 0, 1, 2, 3, 4 window cases
- tests for main pane ratio and main pane count

Acceptance:

- `npm test` passes
- layout math matches Amethyst expectations closely enough to preserve feel

### Milestone 1.5: Personal Custom Layouts

Deliverable:

- port `3column-mid-focus`
- port `5column-middle`
- add tests for fallback behavior below `1400px`
- add tests for ultrawide column distribution
- add the two custom layouts to the default cycle

Acceptance:

- cycle order matches `.amethyst.yml`: `tall`, `fullscreen`, `wide`, `column`, `3column-mid-focus`, `5column-middle`
- the first window stays centered in both custom layouts
- side windows distribute exactly like the macOS custom layout files

### Milestone 2: Window Tracking And Reflow

Deliverable:

- track normal windows on active workspace/monitor
- run reflow on creation/removal/workspace switch
- apply frames without animation

Acceptance:

- opening 1-4 terminal windows tiles them automatically
- closing a tiled window reflows the rest
- dialogs do not get tiled

### Milestone 3: Amethyst Keybindings

Deliverable:

- register MVP keybindings
- layout selection works
- main pane ratio/count works
- focus/swap works
- manual reflow works

Acceptance:

- `Control+Alt+f` selects Column
- `Control+Alt+s` selects Wide
- `Control+Alt+a` selects Tall
- `Control+Alt+h/l` changes main pane size
- `Control+Alt+j/k` moves focus through managed order
- `Control+Alt+Shift+j/k` swaps order and reflows

### Milestone 4: State Persistence

Deliverable:

- persist selected layout
- persist main pane ratio/count
- persist floated windows for current session
- optionally persist per workspace layout by index

Acceptance:

- disable/re-enable keeps layout preference
- workspace layout choice survives GNOME Shell restart if practical

### Milestone 5: Polish

Deliverable:

- small indicator menu
- current layout HUD or indicator text
- gap setting
- app/window exception list
- basic preferences page

Acceptance:

- daily use feels calm
- no surprise tiling of utility dialogs
- no frequent journal errors

## Testing Strategy

Automated tests:

- all layout algorithms
- custom layout ports against examples from dotfiles
- rounding behavior
- gap application
- window ordering operations
- swap/focus command state transitions

Run tests with Node's built-in runner, for example `node --test` against the compiled test files. Add a test framework only if the built-in runner becomes a real blocker.

Manual tests:

- GNOME Terminal
- Firefox
- VS Code/Cursor
- file chooser dialogs
- floating utility windows
- multiple workspaces
- multiple monitors if available
- fractional scaling if enabled
- suspend/resume
- extension disable/re-enable

Debug commands:

```bash
journalctl --follow /usr/bin/gnome-shell
gnome-extensions list
gnome-extensions enable gnomeethyst@local
gnome-extensions disable gnomeethyst@local
```

## Known Risks

GNOME Shell extension APIs are not as stable as normal app APIs.

Mitigation:

- keep GNOME-specific code small
- keep layout engine pure and well-tested
- target this machine first
- avoid deep monkey-patching of shell internals

Wayland window management has fewer escape hatches than X11.

Mitigation:

- use GNOME Shell/Mutter APIs from inside the extension
- do not build an external daemon
- avoid xdotool/wmctrl-style tools

Some apps resist exact sizes.

Mitigation:

- accept slight mismatch
- add minimum size checks
- float tiny or constrained windows

Dynamic workspaces can reorder or disappear.

Mitigation:

- start with active workspace index
- revalidate state on workspace changes
- rebuild state from actual visible windows when uncertain

Keybindings may conflict.

Mitigation:

- use GSettings keybindings so they are configurable
- keep your Amethyst defaults from `.amethyst.yml`
- document common `Ctrl+Alt` conflicts if they appear on Fedora

## Non-Goals For MVP

- no custom compositor
- no xmonad/i3/sway compatibility layer
- no drag-and-drop visual tiling editor
- no FancyZones-style snap assistant
- no animations
- no complex preferences UI before daily-use needs are clear
- no upstream GNOME Extensions publication until it survives daily use locally

## Repository Setup

Before implementation starts, the workspace repo should already exist with a sensible `.gitignore`. The user owns this setup step; do not initialize or restructure the repository unless explicitly asked.

## First Implementation Pass

Build in this order:

1. confirm repo setup and `.gitignore` are in place
2. re-check latest package versions with `npm view <package> version`
3. create the extension scaffold at the repository root
4. add `metadata.json`, schema, build scripts
5. create pure layout engine and tests
6. port the two custom layouts from `dotfiles-macos`
7. install a minimal extension with a panel indicator
8. add window tracking and reflow
9. add keybindings from your `.amethyst.yml`
10. daily-drive it for a week
11. only then add preferences and polish

## Definition Of Success

This project succeeds when GNOME stops feeling like a different window-management language.

Specifically:

- choosing `Column` or `Wide` once is enough
- new windows automatically land where expected
- the Amethyst shortcuts work without thinking
- GNOME remains GNOME
- the codebase is small enough that we can keep it working across GNOME updates
