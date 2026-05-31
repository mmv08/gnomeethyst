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

export const columnLayout: DynamicLayout = {
  key: 'column',
  name: 'Column',
  assign(
    windows: ManagedWindow[],
    workArea: Rect,
    state: LayoutState,
  ): Map<string, Rect> {
    if (windows.length === 0) return new Map();

    const mainPaneCount = Math.min(
      windows.length,
      clampMainPaneCount(state.mainPaneCount),
    );
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
      stackHorizontally(mainWindows, mainFrame),
      stackHorizontally(secondaryWindows, secondaryFrame),
    );
  },
};
