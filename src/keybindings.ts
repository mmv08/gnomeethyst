import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { keybindings, type GnomeethystSettings } from './settings';

type BindingHandler = () => void;

/**
 * Owns GNOME Shell keybinding registration for the extension lifecycle.
 *
 * @remarks
 * `Main.wm.addKeybinding` is global shell state. Tracking the names we register
 * keeps disable/reload cleanup deterministic during extension development.
 */
export class Keybindings {
  private readonly registered = new Set<string>();

  constructor(
    private readonly settings: GnomeethystSettings,
    private readonly handlers: Partial<Record<(typeof keybindings)[number], BindingHandler>>,
  ) {}

  /**
   * Registers configured handlers against GSettings-backed shortcuts.
   */
  enable(): void {
    keybindings.forEach((name) => {
      const handler = this.handlers[name];
      if (!handler) return;

      Main.wm.addKeybinding(
        name,
        this.settings.settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        handler,
      );
      this.registered.add(name);
    });
  }

  /**
   * Removes only bindings this instance registered.
   */
  destroy(): void {
    this.registered.forEach((name) => {
      Main.wm.removeKeybinding(name);
    });
    this.registered.clear();
  }
}
