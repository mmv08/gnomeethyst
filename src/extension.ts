import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Keybindings } from './keybindings';
import { GnomeethystSettings } from './settings';
import { ReflowController } from './shell/reflowController';
import { PanelIndicator } from './shell/panelIndicator';

export default class GnomeethystExtension extends Extension {
  private settingsWrapper: GnomeethystSettings | null = null;
  private reflowController: ReflowController | null = null;
  private keybindings: Keybindings | null = null;
  private indicator: PanelIndicator | null = null;

  enable(): void {
    try {
      this.settingsWrapper = new GnomeethystSettings(this.getSettings());
      this.reflowController = new ReflowController(this.settingsWrapper);
      this.indicator = new PanelIndicator({
        onDisableExtension: () => Main.extensionManager.disableExtension(this.uuid),
        onReflow: () => this.reflowController?.scheduleReflow(),
        onToggleTiling: () => this.reflowController?.toggleTiling(),
      });
      this.reflowController.onLayoutChanged((layoutName, enabled) => {
        this.indicator?.setLayoutName(layoutName, enabled);
      });

      this.keybindings = new Keybindings(this.settingsWrapper, {
        'cycle-layout-forward': () => this.reflowController?.cycleLayout(1),
        'cycle-layout-backward': () => this.reflowController?.cycleLayout(-1),
        'select-tall-layout': () => this.reflowController?.selectLayout('tall'),
        'select-wide-layout': () => this.reflowController?.selectLayout('wide'),
        'select-fullscreen-layout': () =>
          this.reflowController?.selectLayout('fullscreen'),
        'select-column-layout': () => this.reflowController?.selectLayout('column'),
        'select-3column-mid-focus-layout': () =>
          this.reflowController?.selectLayout('3column-mid-focus'),
        'select-5column-middle-layout': () =>
          this.reflowController?.selectLayout('5column-middle'),
        'shrink-main': () => this.reflowController?.resizeMainPane(-1),
        'expand-main': () => this.reflowController?.resizeMainPane(1),
        'increase-main': () => this.reflowController?.changeMainPaneCount(1),
        'decrease-main': () => this.reflowController?.changeMainPaneCount(-1),
        'focus-prev': () => this.reflowController?.focusWindow(-1),
        'focus-next': () => this.reflowController?.focusWindow(1),
        'swap-prev': () => this.reflowController?.swapWindow(-1),
        'swap-next': () => this.reflowController?.swapWindow(1),
        'swap-main': () => this.reflowController?.swapFocusedWithMain(),
        'toggle-float': () => this.reflowController?.toggleFloat(),
        'toggle-tiling': () => this.reflowController?.toggleTiling(),
        reflow: () => this.reflowController?.scheduleReflow(),
        'display-current-layout': () =>
          this.reflowController?.displayCurrentLayout(),
      });

      this.keybindings.enable();
      this.reflowController.enable();
    } catch (error) {
      this.disable();
      throw error;
    }
  }

  disable(): void {
    this.keybindings?.destroy();
    this.keybindings = null;
    this.reflowController?.destroy();
    this.reflowController = null;
    this.indicator?.destroy();
    this.indicator = null;
    this.settingsWrapper = null;
  }
}
