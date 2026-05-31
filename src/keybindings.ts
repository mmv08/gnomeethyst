import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { keybindings, type GnomeethystSettings } from './settings';

type BindingHandler = () => void;

export class Keybindings {
  private readonly registered = new Set<string>();

  constructor(
    private readonly settings: GnomeethystSettings,
    private readonly handlers: Partial<Record<(typeof keybindings)[number], BindingHandler>>,
  ) {}

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

  destroy(): void {
    this.registered.forEach((name) => Main.wm.removeKeybinding(name));
    this.registered.clear();
  }
}
