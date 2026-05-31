import {
  clampMainPaneCount,
  clampRatio,
  mergeAssignments,
  stackVertically,
  type DynamicLayout,
  type ManagedWindow,
  type Rect,
  type LayoutState,
} from './types';

/**
 * Amethyst's Tall layout: main pane on the left, secondary pane on the right.
 *
 * @remarks
 * The first `mainPaneCount` windows keep main-pane status. Additional windows
 * stack vertically in the secondary pane so opening a new window reflows
 * predictably without changing the established order.
 */
export const tallLayout: DynamicLayout = {
  key: 'tall',
  name: 'Tall',
  assign(windows: ManagedWindow[], workArea: Rect, state: LayoutState): Map<string, Rect> {
    if (windows.length === 0) return new Map();
    if (windows.length === 1) return new Map([[windows[0]!.id, { ...workArea }]]);

    const mainPaneCount = Math.min(windows.length, clampMainPaneCount(state.mainPaneCount));
    const mainWindows = windows.slice(0, mainPaneCount);
    const secondaryWindows = windows.slice(mainPaneCount);
    const hasSecondaryPane = secondaryWindows.length > 0;
    const mainWidth = hasSecondaryPane
      ? workArea.width * clampRatio(state.mainPaneRatio)
      : workArea.width;

    const mainFrame = {
      x: workArea.x,
      y: workArea.y,
      width: mainWidth,
      height: workArea.height,
    };
    const secondaryFrame = {
      x: workArea.x + mainWidth,
      y: workArea.y,
      width: workArea.width - mainWidth,
      height: workArea.height,
    };

    return mergeAssignments(
      stackVertically(mainWindows, mainFrame),
      stackVertically(secondaryWindows, secondaryFrame),
    );
  },
};
