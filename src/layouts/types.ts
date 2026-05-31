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

export type LayoutKey =
  | 'tall'
  | 'fullscreen'
  | 'wide'
  | 'column'
  | '3column-mid-focus'
  | '5column-middle';

export type LayoutState = {
  mainPaneRatio: number;
  mainPaneCount: number;
};

export interface DynamicLayout {
  key: LayoutKey;
  name: string;
  assign(
    windows: ManagedWindow[],
    workArea: Rect,
    state: LayoutState,
  ): Map<string, Rect>;
}

export const DEFAULT_LAYOUT_STATE: LayoutState = {
  mainPaneRatio: 0.5,
  mainPaneCount: 1,
};

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_LAYOUT_STATE.mainPaneRatio;
  return Math.min(0.9, Math.max(0.1, ratio));
}

export function clampMainPaneCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_LAYOUT_STATE.mainPaneCount;
  return Math.max(1, Math.floor(count));
}

export function assignAll(windows: ManagedWindow[], rect: Rect): Map<string, Rect> {
  return new Map(windows.map((window) => [window.id, { ...rect }]));
}

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

export function mergeAssignments(
  ...maps: Array<Map<string, Rect>>
): Map<string, Rect> {
  const merged = new Map<string, Rect>();
  maps.forEach((map) => {
    map.forEach((rect, windowId) => merged.set(windowId, rect));
  });
  return merged;
}
