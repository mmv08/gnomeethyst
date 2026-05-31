import {
  mergeAssignments,
  stackVertically,
  type DynamicLayout,
  type LayoutState,
  type ManagedWindow,
  type Rect,
} from './types';

const RATIOS = {
  outer: 0.13,
  inner: 0.2,
  main: 0.34,
};

/**
 * Custom ultrawide layout ported from the macOS Amethyst dotfiles.
 *
 * @remarks
 * The center column is the main area. Extra windows fill the inner columns
 * before the outer columns, which keeps the most recently important secondary
 * windows near the focused center on wide displays.
 *
 * @see https://github.com/mmv08/dotfiles-macos/blob/d3695feff2190e1fafc6fc508378817adc13d65b/dotfiles-meta/amethyst/Layouts/5column-middle.js
 */
export const fiveColumnMiddleLayout: DynamicLayout = {
  key: '5column-middle',
  name: '5Column Middle',
  assign(windows: ManagedWindow[], workArea: Rect, _state: LayoutState): Map<string, Rect> {
    if (windows.length === 0) return new Map();

    const outerWidth = workArea.width * RATIOS.outer;
    const innerWidth = workArea.width * RATIOS.inner;
    const mainWidth = workArea.width * RATIOS.main;
    const x0 = workArea.x;

    const frames = {
      outerLeft: {
        x: x0,
        y: workArea.y,
        width: outerWidth,
        height: workArea.height,
      },
      innerLeft: {
        x: x0 + outerWidth,
        y: workArea.y,
        width: innerWidth,
        height: workArea.height,
      },
      main: {
        x: x0 + outerWidth + innerWidth,
        y: workArea.y,
        width: mainWidth,
        height: workArea.height,
      },
      innerRight: {
        x: x0 + outerWidth + innerWidth + mainWidth,
        y: workArea.y,
        width: innerWidth,
        height: workArea.height,
      },
      outerRight: {
        x: x0 + outerWidth + innerWidth + mainWidth + innerWidth,
        y: workArea.y,
        width: outerWidth,
        height: workArea.height,
      },
    };

    const columns: Record<
      'innerLeft' | 'innerRight' | 'outerLeft' | 'outerRight',
      ManagedWindow[]
    > = {
      innerLeft: [],
      innerRight: [],
      outerLeft: [],
      outerRight: [],
    };
    const order = ['innerLeft', 'innerRight', 'outerLeft', 'outerRight'] as const;
    windows.slice(1).forEach((window, index) => {
      columns[order[index % order.length]!].push(window);
    });

    return mergeAssignments(
      stackVertically(columns.outerLeft, frames.outerLeft),
      stackVertically(columns.innerLeft, frames.innerLeft),
      new Map([[windows[0]!.id, frames.main]]),
      stackVertically(columns.innerRight, frames.innerRight),
      stackVertically(columns.outerRight, frames.outerRight),
    );
  },
};
