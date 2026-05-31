import {
  clampMainPaneCount,
  clampRatio,
  mergeAssignments,
  stackHorizontally,
  type DynamicLayout,
  type LayoutState,
  type ManagedWindow,
  type Rect,
} from './types';

/**
 * Amethyst's Wide layout: the Tall layout rotated ninety degrees.
 *
 * @remarks
 * The main pane spans the top of the work area. Secondary windows split the
 * bottom pane horizontally, matching the layout muscle memory from Amethyst.
 */
export const wideLayout: DynamicLayout = {
  key: 'wide',
  name: 'Wide',
  assign(
    windows: ManagedWindow[],
    workArea: Rect,
    state: LayoutState,
  ): Map<string, Rect> {
    if (windows.length === 0) return new Map();
    if (windows.length === 1) return new Map([[windows[0]!.id, { ...workArea }]]);

    const mainPaneCount = Math.min(
      windows.length,
      clampMainPaneCount(state.mainPaneCount),
    );
    const mainWindows = windows.slice(0, mainPaneCount);
    const secondaryWindows = windows.slice(mainPaneCount);
    const hasSecondaryPane = secondaryWindows.length > 0;
    const mainHeight = hasSecondaryPane
      ? workArea.height * clampRatio(state.mainPaneRatio)
      : workArea.height;

    const mainFrame = {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: mainHeight,
    };
    const secondaryFrame = {
      x: workArea.x,
      y: workArea.y + mainHeight,
      width: workArea.width,
      height: workArea.height - mainHeight,
    };

    return mergeAssignments(
      stackHorizontally(mainWindows, mainFrame),
      stackHorizontally(secondaryWindows, secondaryFrame),
    );
  },
};
