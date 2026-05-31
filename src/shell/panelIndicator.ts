import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export class PanelIndicator {
  private readonly button: PanelMenu.Button;
  private readonly label: St.Label;

  constructor() {
    this.button = new PanelMenu.Button(0.0, 'Gnomeethyst');
    this.label = new St.Label({
      text: 'Gem',
    });
    this.button.add_child(this.label);
    Main.panel.addToStatusArea('gnomeethyst', this.button);
  }

  setLayoutName(name: string, tilingEnabled: boolean): void {
    this.label.set_text(tilingEnabled ? name : `${name} off`);
  }

  destroy(): void {
    this.button.destroy();
  }
}
