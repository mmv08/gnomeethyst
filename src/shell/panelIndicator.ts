import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

type PanelIndicatorActions = {
  onDisableExtension: () => void;
  onReflow: () => void;
  onToggleTiling: () => void;
};

type ButtonEvent = {
  get_button(): number;
};

export class PanelIndicator {
  private readonly button: PanelMenu.Button;
  private readonly label: St.Label;

  constructor(actions: PanelIndicatorActions) {
    this.button = new PanelMenu.Button(0.0, 'Gnomeethyst');
    this.label = new St.Label({
      text: 'Gem',
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this.button.add_child(this.label);
    this.addMenuItems(actions);
    this.button.connect(
      'button-press-event',
      (_actor: unknown, event: unknown) => {
        if ((event as ButtonEvent).get_button() !== Clutter.BUTTON_SECONDARY) {
          return Clutter.EVENT_PROPAGATE;
        }

        this.button.menu.open();
        return Clutter.EVENT_STOP;
      },
    );
    Main.panel.addToStatusArea('gnomeethyst', this.button);
  }

  setLayoutName(name: string, tilingEnabled: boolean): void {
    this.label.set_text(tilingEnabled ? name : `${name} off`);
  }

  destroy(): void {
    this.button.destroy();
  }

  private addMenuItems(actions: PanelIndicatorActions): void {
    const toggleTiling = new PopupMenu.PopupMenuItem('Toggle Tiling');
    toggleTiling.connect('activate', actions.onToggleTiling);
    this.button.menu.addMenuItem(toggleTiling);

    const reflow = new PopupMenu.PopupMenuItem('Reflow Windows');
    reflow.connect('activate', actions.onReflow);
    this.button.menu.addMenuItem(reflow);

    this.button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const disable = new PopupMenu.PopupMenuItem('Disable Gnomeethyst');
    disable.connect('activate', actions.onDisableExtension);
    this.button.menu.addMenuItem(disable);
  }
}
