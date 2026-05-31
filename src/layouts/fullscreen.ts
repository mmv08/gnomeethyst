import { assignAll, type DynamicLayout } from './types';

/**
 * Geometry-only fullscreen layout.
 *
 * @remarks
 * Every managed window receives the full work area. Focus and stacking remain
 * GNOME Shell responsibilities; the reflow controller nudges focus after
 * applying this layout.
 */
export const fullscreenLayout: DynamicLayout = {
  key: 'fullscreen',
  name: 'Fullscreen',
  assign(windows, workArea) {
    return assignAll(windows, workArea);
  },
};
