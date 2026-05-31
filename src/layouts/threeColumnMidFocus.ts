import {
  mergeAssignments,
  stackVertically,
  type DynamicLayout,
  type LayoutState,
  type ManagedWindow,
  type Rect,
} from './types';

const MAIN_WIDTH_RATIO = 0.62;
const SMALL_SCREEN_WIDTH = 1400;
const SMALL_SCREEN_MAIN_WIDTH_RATIO = 0.55;

/**
 * Custom center-focus layout ported from the macOS Amethyst dotfiles.
 *
 * @remarks
 * The first window is intentionally privileged as the center/main window.
 * Remaining windows alternate left/right so both side columns grow evenly.
 * Below 1400px the layout falls back to a simpler two-pane split because the
 * side gutters become too narrow to be useful.
 *
 * @see https://github.com/mmv08/dotfiles-macos/blob/d3695feff2190e1fafc6fc508378817adc13d65b/dotfiles-meta/amethyst/Layouts/3column-mid-focus.js
 */
export const threeColumnMidFocusLayout: DynamicLayout = {
  key: '3column-mid-focus',
  name: '3Column Mid Focus',
  assign(
    windows: ManagedWindow[],
    workArea: Rect,
    _state: LayoutState,
  ): Map<string, Rect> {
    if (windows.length === 0) return new Map();

    const mainWindow = windows[0]!;
    const rest = windows.slice(1);

    if (workArea.width < SMALL_SCREEN_WIDTH) {
      const mainWidth = workArea.width * SMALL_SCREEN_MAIN_WIDTH_RATIO;
      const mainFrame = {
        x: workArea.x,
        y: workArea.y,
        width: mainWidth,
        height: workArea.height,
      };
      const sideFrame = {
        x: workArea.x + mainWidth,
        y: workArea.y,
        width: workArea.width - mainWidth,
        height: workArea.height,
      };

      return mergeAssignments(
        new Map([[mainWindow.id, mainFrame]]),
        stackVertically(rest, sideFrame),
      );
    }

    const mainWidth = workArea.width * MAIN_WIDTH_RATIO;
    const sideWidth = (workArea.width - mainWidth) / 2;
    const leftFrame = {
      x: workArea.x,
      y: workArea.y,
      width: sideWidth,
      height: workArea.height,
    };
    const mainFrame = {
      x: workArea.x + sideWidth,
      y: workArea.y,
      width: mainWidth,
      height: workArea.height,
    };
    const rightFrame = {
      x: workArea.x + sideWidth + mainWidth,
      y: workArea.y,
      width: sideWidth,
      height: workArea.height,
    };

    const left: ManagedWindow[] = [];
    const right: ManagedWindow[] = [];
    rest.forEach((window, index) => {
      if (index % 2 === 0) left.push(window);
      else right.push(window);
    });

    return mergeAssignments(
      stackVertically(left, leftFrame),
      new Map([[mainWindow.id, mainFrame]]),
      stackVertically(right, rightFrame),
    );
  },
};
