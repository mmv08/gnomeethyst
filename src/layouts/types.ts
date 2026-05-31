/**
 * A logical GNOME work-area rectangle in screen coordinates.
 *
 * @remarks
 * Layout code deliberately stays unaware of `Mtk.Rectangle` so it can be
 * tested under Node and reused without a running GNOME Shell.
 */
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * The smallest window model needed by layout algorithms.
 *
 * @remarks
 * `id` is the stable key used when returning assignments. `isFocused` is kept
 * in the shared model even though the current layouts are order-based, because
 * focus-aware layouts are a natural Amethyst extension point.
 */
export type ManagedWindow = {
  id: string;
  isFocused: boolean;
};

/**
 * Built-in layout identifiers supported by the settings schema and registry.
 */
export type LayoutKey =
  | 'tall'
  | 'fullscreen'
  | 'wide'
  | 'column'
  | '3column-mid-focus'
  | '5column-middle';

/**
 * User-adjustable state shared by paned layouts.
 */
export type LayoutState = {
  mainPaneRatio: number;
  mainPaneCount: number;
};

/**
 * Pure layout contract.
 *
 * @remarks
 * Implementations must be deterministic and side-effect free: they receive an
 * ordered window list and return the rectangles the shell layer should apply.
 */
export interface DynamicLayout {
  key: LayoutKey;
  name: string;
  assign(
    windows: ManagedWindow[],
    workArea: Rect,
    state: LayoutState,
  ): Map<string, Rect>;
}

/**
 * Amethyst-compatible defaults for first-run layout state.
 */
export const DEFAULT_LAYOUT_STATE: LayoutState = {
  mainPaneRatio: 0.5,
  mainPaneCount: 1,
};

/**
 * Bounds the main pane ratio to a range that keeps both panes usable.
 *
 * @internal
 */
export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_LAYOUT_STATE.mainPaneRatio;
  return Math.min(0.9, Math.max(0.1, ratio));
}

/**
 * Normalizes a user-provided main pane count.
 *
 * @internal
 */
export function clampMainPaneCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_LAYOUT_STATE.mainPaneCount;
  return Math.max(1, Math.floor(count));
}

/**
 * Assigns all windows to the same frame.
 *
 * @internal
 * @remarks
 * Used by Fullscreen, where stacking is left to GNOME Shell's normal focus
 * order rather than expressed in geometry.
 */
export function assignAll(windows: ManagedWindow[], rect: Rect): Map<string, Rect> {
  return new Map(windows.map((window) => [window.id, { ...rect }]));
}

/**
 * Splits a frame into equal vertical slices.
 *
 * @internal
 * @example
 * Two windows in `{ x: 0, y: 0, width: 100, height: 80 }` receive heights of 40.
 */
export function stackVertically(
  windows: ManagedWindow[],
  frame: Rect,
): Map<string, Rect> {
  const assignments = new Map<string, Rect>();
  if (windows.length === 0) return assignments;

  const height = frame.height / windows.length;
  windows.forEach((window, index) => {
    assignments.set(window.id, {
      x: frame.x,
      y: frame.y + index * height,
      width: frame.width,
      height,
    });
  });
  return assignments;
}

/**
 * Splits a frame into equal horizontal slices.
 *
 * @internal
 * @example
 * Two windows in `{ x: 0, y: 0, width: 100, height: 80 }` receive widths of 50.
 */
export function stackHorizontally(
  windows: ManagedWindow[],
  frame: Rect,
): Map<string, Rect> {
  const assignments = new Map<string, Rect>();
  if (windows.length === 0) return assignments;

  const width = frame.width / windows.length;
  windows.forEach((window, index) => {
    assignments.set(window.id, {
      x: frame.x + index * width,
      y: frame.y,
      width,
      height: frame.height,
    });
  });
  return assignments;
}

/**
 * Combines independent pane assignment maps.
 *
 * @internal
 * @remarks
 * Later maps win on duplicate ids, which is useful for layouts that place the
 * main window explicitly between side-pane assignments.
 */
export function mergeAssignments(
  ...maps: Array<Map<string, Rect>>
): Map<string, Rect> {
  const merged = new Map<string, Rect>();
  maps.forEach((map) => {
    map.forEach((rect, windowId) => merged.set(windowId, rect));
  });
  return merged;
}
