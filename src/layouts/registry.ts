import { columnLayout } from './column';
import { fiveColumnMiddleLayout } from './fiveColumnMiddle';
import { fullscreenLayout } from './fullscreen';
import { tallLayout } from './tall';
import { threeColumnMidFocusLayout } from './threeColumnMidFocus';
import { wideLayout } from './wide';
import type { DynamicLayout, LayoutKey } from './types';

/**
 * Default layout order from the user's Amethyst configuration.
 *
 * @remarks
 * This is both the first-run cycle and the fallback when GSettings contains no
 * valid layout keys.
 */
export const DEFAULT_LAYOUT_CYCLE: LayoutKey[] = [
  'tall',
  'fullscreen',
  'wide',
  'column',
  '3column-mid-focus',
  '5column-middle',
];

const layouts = [
  tallLayout,
  fullscreenLayout,
  wideLayout,
  columnLayout,
  threeColumnMidFocusLayout,
  fiveColumnMiddleLayout,
] satisfies DynamicLayout[];

/**
 * Registry of built-in layouts keyed by settings/schema identifiers.
 */
export const LAYOUTS = new Map<LayoutKey, DynamicLayout>(
  layouts.map((layout) => [layout.key, layout]),
);

/**
 * Narrows arbitrary GSettings strings to supported layout keys.
 */
export function isLayoutKey(value: string): value is LayoutKey {
  return LAYOUTS.has(value as LayoutKey);
}

/**
 * Looks up a layout with Tall as the safe fallback.
 *
 * @remarks
 * GSettings values may survive code changes; falling back here keeps the shell
 * extension usable even if a stale or manually edited layout key appears.
 */
export function getLayout(key: string): DynamicLayout {
  return LAYOUTS.get(isLayoutKey(key) ? key : 'tall') ?? tallLayout;
}
