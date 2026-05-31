/**
 * Minimal GNOME Shell globals used by Gnomeethyst.
 *
 * @remarks
 * These declarations are intentionally local shims, not an attempt to model the
 * complete Shell API. Prefer adding only the members the extension actually
 * consumes so drift across Shell versions stays visible.
 */
declare const global: {
  display: import('gi://Meta').Display;
  get_current_time(): number;
  get_window_actors(): Array<{ metaWindow: import('gi://Meta').Window }>;
  workspaceManager?: unknown;
  workspace_manager?: unknown;
  windowManager?: unknown;
  window_manager?: unknown;
};

/**
 * Local declaration for the extension base class imported from Shell resources.
 */
declare module 'resource:///org/gnome/shell/extensions/extension.js' {
  import Gio from 'gi://Gio';

  export class Extension {
    uuid: string;
    getSettings(schema?: string): Gio.Settings;
    enable(): void;
    disable(): void;
  }
}

/**
 * Minimal `ui/main.js` surface used by the Shell integration layer.
 */
declare module 'resource:///org/gnome/shell/ui/main.js' {
  import Meta from 'gi://Meta';

  export const wm: {
    addKeybinding(
      name: string,
      settings: import('gi://Gio').Settings,
      flags: Meta.KeyBindingFlags,
      mode: import('gi://Shell').ActionMode,
      handler: (...args: unknown[]) => void,
    ): void;
    removeKeybinding(name: string): void;
  };

  export const panel: {
    addToStatusArea(role: string, indicator: unknown): void;
  };

  export const extensionManager: {
    disableExtension(uuid: string): boolean;
  };

  export const layoutManager: {
    monitors: Array<{ index: number }>;
    primaryIndex: number;
    getWorkAreaForMonitor(index: number): import('gi://Mtk').Rectangle;
    connect(signal: string, callback: (...args: unknown[]) => void): number;
    disconnect(id: number): void;
  };

  export function activateWindow(window: Meta.Window, timestamp?: number): void;

  export function notify(title: string, body: string): void;
}

/**
 * Minimal `PanelMenu.Button` shape used by the panel indicator.
 */
declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
  export class Button {
    menu: {
      addMenuItem(item: unknown): void;
      open(animate?: unknown): void;
    };
    constructor(menuAlignment?: number, nameText?: string);
    add_child(actor: unknown): void;
    connect(signal: string, callback: (...args: unknown[]) => unknown): number;
    destroy(): void;
  }
}

/**
 * Minimal popup menu declarations for indicator actions.
 */
declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
  export class PopupMenuItem {
    constructor(text: string);
    connect(signal: 'activate', callback: (...args: unknown[]) => void): number;
  }

  export class PopupSeparatorMenuItem {
    constructor(text?: string);
  }
}
