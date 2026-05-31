import { columnLayout } from './column';
import { fiveColumnMiddleLayout } from './fiveColumnMiddle';
import { fullscreenLayout } from './fullscreen';
import { tallLayout } from './tall';
import { threeColumnMidFocusLayout } from './threeColumnMidFocus';
import { wideLayout } from './wide';
import type { DynamicLayout, LayoutKey } from './types';

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

export const LAYOUTS = new Map<LayoutKey, DynamicLayout>(
  layouts.map((layout) => [layout.key, layout]),
);

export function isLayoutKey(value: string): value is LayoutKey {
  return LAYOUTS.has(value as LayoutKey);
}

export function getLayout(key: string): DynamicLayout {
  return LAYOUTS.get(isLayoutKey(key) ? key : 'tall') ?? tallLayout;
}
