import Gio from 'gi://Gio';
import { DEFAULT_LAYOUT_CYCLE, isLayoutKey } from './layouts/registry';
import {
  clampMainPaneCount,
  clampRatio,
  type LayoutKey,
  type LayoutState,
} from './layouts/types';

export const keybindings = [
  'cycle-layout-forward',
  'cycle-layout-backward',
  'select-tall-layout',
  'select-wide-layout',
  'select-fullscreen-layout',
  'select-column-layout',
  'select-3column-mid-focus-layout',
  'select-5column-middle-layout',
  'shrink-main',
  'expand-main',
  'increase-main',
  'decrease-main',
  'focus-prev',
  'focus-next',
  'swap-prev',
  'swap-next',
  'swap-main',
  'toggle-float',
  'toggle-tiling',
  'reflow',
  'display-current-layout',
] as const;

export class GnomeethystSettings {
  constructor(readonly settings: Gio.Settings) {}

  get tilingEnabled(): boolean {
    return this.settings.get_boolean('tiling-enabled');
  }

  set tilingEnabled(value: boolean) {
    this.settings.set_boolean('tiling-enabled', value);
  }

  get currentLayout(): LayoutKey {
    const key = this.settings.get_string('current-layout');
    return isLayoutKey(key) ? key : DEFAULT_LAYOUT_CYCLE[0]!;
  }

  set currentLayout(value: LayoutKey) {
    this.settings.set_string('current-layout', value);
  }

  get layoutCycle(): LayoutKey[] {
    const configured = this.settings
      .get_strv('layout-cycle')
      .filter(isLayoutKey);
    return configured.length > 0 ? configured : DEFAULT_LAYOUT_CYCLE;
  }

  get layoutState(): LayoutState {
    return {
      mainPaneRatio: clampRatio(this.settings.get_double('main-pane-ratio')),
      mainPaneCount: clampMainPaneCount(
        this.settings.get_int('main-pane-count'),
      ),
    };
  }

  set mainPaneRatio(value: number) {
    this.settings.set_double('main-pane-ratio', clampRatio(value));
  }

  set mainPaneCount(value: number) {
    this.settings.set_int('main-pane-count', clampMainPaneCount(value));
  }

  get innerGap(): number {
    return Math.max(0, this.settings.get_int('inner-gap'));
  }

  get outerGap(): number {
    return Math.max(0, this.settings.get_int('outer-gap'));
  }
}
