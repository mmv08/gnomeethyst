import type Meta from 'gi://Meta';
import type { Rect } from '../layouts/types';

type GapValues = {
  innerGap: number;
  outerGap: number;
};

/**
 * Treats tiny frame differences as already applied.
 *
 * @internal
 * @remarks
 * Mutter and clients may round frame geometry slightly differently; chasing
 * sub-pixel differences would create unnecessary resize churn.
 */
function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 2;
}

/**
 * Applies inner and outer gaps to a layout assignment.
 *
 * @internal
 * @remarks
 * Outer gaps are only applied at the work-area boundary. Internal edges split
 * the configured gap so neighboring windows share the spacing evenly.
 */
function insetRect(rect: Rect, workArea: Rect, gaps: GapValues): Rect {
  const left = rect.x <= workArea.x + 1 ? gaps.outerGap : Math.floor(gaps.innerGap / 2);
  const top = rect.y <= workArea.y + 1 ? gaps.outerGap : Math.floor(gaps.innerGap / 2);
  const right =
    rect.x + rect.width >= workArea.x + workArea.width - 1
      ? gaps.outerGap
      : Math.ceil(gaps.innerGap / 2);
  const bottom =
    rect.y + rect.height >= workArea.y + workArea.height - 1
      ? gaps.outerGap
      : Math.ceil(gaps.innerGap / 2);

  return {
    x: rect.x + left,
    y: rect.y + top,
    width: Math.max(1, rect.width - left - right),
    height: Math.max(1, rect.height - top - bottom),
  };
}

/**
 * Applies one computed layout frame to a GNOME Shell window.
 *
 * @remarks
 * Maximized windows must be unmaximized before Mutter accepts explicit frame
 * geometry. The near-equality check avoids fighting clients that report frame
 * sizes a pixel or two away from the requested value.
 */
export function applyWindowFrame(
  window: Meta.Window,
  rect: Rect,
  workArea: Rect,
  gaps: GapValues,
): void {
  const destination = insetRect(rect, workArea, gaps);
  const x = Math.round(destination.x);
  const y = Math.round(destination.y);
  const width = Math.round(destination.width);
  const height = Math.round(destination.height);
  const frame = window.get_frame_rect();

  if (
    nearlyEqual(frame.x, x) &&
    nearlyEqual(frame.y, y) &&
    nearlyEqual(frame.width, width) &&
    nearlyEqual(frame.height, height)
  ) {
    return;
  }

  if (window.maximizedHorizontally || window.maximizedVertically) {
    window.unmaximize();
  }

  window.move_resize_frame(false, x, y, width, height);
}
