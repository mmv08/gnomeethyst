import GLib from 'gi://GLib';
import type Meta from 'gi://Meta';
import type Mtk from 'gi://Mtk';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { getLayout } from '../layouts/registry';
import type { LayoutKey, ManagedWindow, Rect } from '../layouts/types';
import type { GnomeethystSettings } from '../settings';
import { WorkspaceStateStore, type ScopeState } from '../state/workspaceState';
import {
  nextIdInOrder,
  reconcileWindowOrder,
  swapInOrder,
  swapWithMain,
} from '../state/windowOrder';
import { applyWindowFrame } from './frameApplier';
import { SignalStore } from './signalStore';
import { shouldManageWindow, windowId } from './windowFilters';

type WindowManagerLike = {
  connect(signal: string, callback: (...args: unknown[]) => void): number;
  disconnect(id: number): void;
};

type FocusedScopeContext = {
  focused: Meta.Window | null;
  focusedId: string | undefined;
  state: ScopeState;
  windows: Meta.Window[];
};

const REFLOW_DEBOUNCE_MS = 80;
const MAIN_PANE_RATIO_STEP = 0.05;

function workspaceManager(): {
  get_active_workspace_index(): number;
  get_active_workspace(): Meta.Workspace;
  connect(signal: string, callback: (...args: unknown[]) => void): number;
  disconnect(id: number): void;
} {
  return (
    (global as unknown as { workspaceManager?: unknown }).workspaceManager ??
    (global as unknown as { workspace_manager: unknown }).workspace_manager
  ) as ReturnType<typeof workspaceManager>;
}

function windowManager(): WindowManagerLike {
  return (
    (global as unknown as { windowManager?: unknown }).windowManager ??
    (global as unknown as { window_manager: unknown }).window_manager
  ) as WindowManagerLike;
}

function rectFromMtk(rect: Mtk.Rectangle): Rect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

export class ReflowController {
  private readonly signals = new SignalStore();
  private readonly state = new WorkspaceStateStore();
  private readonly windowSignals = new Map<Meta.Window, number[]>();
  private reflowTimerId = 0;
  private applyingFrames = false;
  private layoutChangedCallback: ((layoutName: string, enabled: boolean) => void) | null =
    null;

  constructor(private readonly settings: GnomeethystSettings) {}

  enable(): void {
    this.signals.connect(global.display, 'window-created', (_display, window) => {
      this.watchWindow(window as Meta.Window);
      this.scheduleReflow();
    });
    this.signals.connect(
      workspaceManager(),
      'active-workspace-changed',
      () => this.scheduleReflow(),
    );
    this.signals.connect(global.display, 'workareas-changed', () =>
      this.scheduleReflow(),
    );
    this.signals.connect(windowManager(), 'minimize', () => this.scheduleReflow());
    this.signals.connect(windowManager(), 'unminimize', () => this.scheduleReflow());

    [
      'tiling-enabled',
      'current-layout',
      'main-pane-ratio',
      'main-pane-count',
      'inner-gap',
      'outer-gap',
    ].forEach((key) => {
      this.signals.connect(
        this.settings.settings,
        `changed::${key}`,
        () => this.scheduleReflow(),
      );
    });

    global.get_window_actors().forEach((actor) =>
      this.watchWindow(actor.metaWindow),
    );
    this.scheduleReflow();
  }

  onLayoutChanged(callback: (layoutName: string, enabled: boolean) => void): void {
    this.layoutChangedCallback = callback;
    this.emitLayoutChanged();
  }

  destroy(): void {
    if (this.reflowTimerId) {
      GLib.source_remove(this.reflowTimerId);
      this.reflowTimerId = 0;
    }
    this.windowSignals.forEach((signalIds, window) => {
      signalIds.forEach((signalId) => window.disconnect(signalId));
    });
    this.windowSignals.clear();
    this.signals.disconnectAll();
    this.state.reset();
  }

  scheduleReflow(): void {
    if (this.applyingFrames) return;
    if (this.reflowTimerId) GLib.source_remove(this.reflowTimerId);

    this.reflowTimerId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      REFLOW_DEBOUNCE_MS,
      () => {
        this.reflowTimerId = 0;
        this.reflow();
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  selectLayout(layoutKey: LayoutKey): void {
    this.settings.currentLayout = layoutKey;
    this.scheduleReflow();
  }

  cycleLayout(direction: -1 | 1): void {
    const cycle = this.settings.layoutCycle;
    const current = this.settings.currentLayout;
    const currentIndex = Math.max(0, cycle.indexOf(current));
    const nextIndex = (currentIndex + direction + cycle.length) % cycle.length;
    this.selectLayout(cycle[nextIndex]!);
  }

  resizeMainPane(delta: number): void {
    this.settings.mainPaneRatio =
      this.settings.layoutState.mainPaneRatio + delta * MAIN_PANE_RATIO_STEP;
    this.scheduleReflow();
  }

  changeMainPaneCount(delta: number): void {
    this.settings.mainPaneCount = this.settings.layoutState.mainPaneCount + delta;
    this.scheduleReflow();
  }

  focusWindow(delta: -1 | 1): void {
    const { focusedId, state, windows } = this.focusedScopeContext();
    const nextId = nextIdInOrder(state.orderedWindowIds, focusedId, delta);
    const nextWindow = nextId
      ? windows.find((window) => windowId(window) === nextId)
      : undefined;
    if (nextWindow) Main.activateWindow(nextWindow, global.get_current_time());
  }

  swapWindow(delta: -1 | 1): void {
    const { focusedId, state } = this.focusedScopeContext();
    if (!focusedId) return;

    state.orderedWindowIds = swapInOrder(state.orderedWindowIds, focusedId, delta);
    this.scheduleReflow();
  }

  swapFocusedWithMain(): void {
    const { focusedId, state } = this.focusedScopeContext();
    if (!focusedId) return;

    state.orderedWindowIds = swapWithMain(state.orderedWindowIds, focusedId);
    this.scheduleReflow();
  }

  toggleFloat(): void {
    const { focused, state } = this.focusedScopeContext();
    if (!focused || !shouldManageWindow(focused)) return;

    const id = windowId(focused);
    if (state.floatingWindowIds.has(id)) state.floatingWindowIds.delete(id);
    else state.floatingWindowIds.add(id);
    this.scheduleReflow();
  }

  toggleTiling(): void {
    this.settings.tilingEnabled = !this.settings.tilingEnabled;
    this.scheduleReflow();
  }

  displayCurrentLayout(): void {
    const layout = getLayout(this.settings.currentLayout);
    Main.notify(
      'Gnomeethyst',
      `${layout.name}${this.settings.tilingEnabled ? '' : ' (off)'}`,
    );
    this.emitLayoutChanged();
  }

  reflow(): void {
    this.emitLayoutChanged();
    if (!this.settings.tilingEnabled) return;

    const workspace = workspaceManager().get_active_workspace();
    const workspaceIndex = workspaceManager().get_active_workspace_index();
    const monitors = Main.layoutManager.monitors;

    this.applyingFrames = true;
    try {
      monitors.forEach((monitor: { index: number }) => {
        const monitorIndex = monitor.index;
        const state = this.state.get(workspaceIndex, monitorIndex);
        state.layoutKey = this.settings.currentLayout;

        const windows = this.windowsForScope(workspace, monitorIndex).filter(
          (window) => !state.floatingWindowIds.has(windowId(window)),
        );
        const ids = windows.map(windowId);
        state.orderedWindowIds = reconcileWindowOrder(state.orderedWindowIds, ids);

        const orderedWindows = state.orderedWindowIds
          .map((id) => windows.find((window) => windowId(window) === id))
          .filter((window): window is Meta.Window => window !== undefined);
        const workArea = rectFromMtk(
          Main.layoutManager.getWorkAreaForMonitor(monitorIndex),
        );
        const managedWindows: ManagedWindow[] = orderedWindows.map((window) => ({
          id: windowId(window),
          isFocused: window === global.display.focus_window,
        }));
        const layout = getLayout(state.layoutKey);
        const assignments = layout.assign(
          managedWindows,
          workArea,
          this.settings.layoutState,
        );

        orderedWindows.forEach((window) => {
          const rect = assignments.get(windowId(window));
          if (!rect) return;
          applyWindowFrame(window, rect, workArea, {
            innerGap: this.settings.innerGap,
            outerGap: this.settings.outerGap,
          });
        });

        if (state.layoutKey === 'fullscreen' && global.display.focus_window) {
          Main.activateWindow(
            global.display.focus_window,
            global.get_current_time(),
          );
        }
      });
    } finally {
      this.applyingFrames = false;
    }
  }

  private emitLayoutChanged(): void {
    const layout = getLayout(this.settings.currentLayout);
    this.layoutChangedCallback?.(layout.name, this.settings.tilingEnabled);
  }

  private watchWindow(window: Meta.Window): void {
    if (this.windowSignals.has(window)) return;
    const signalIds = [
      window.connect('unmanaged', () => {
        this.windowSignals.delete(window);
        this.scheduleReflow();
      }),
      window.connect('shown', () => this.scheduleReflow()),
      window.connect('position-changed', () => this.scheduleReflow()),
      window.connect('size-changed', () => this.scheduleReflow()),
    ];
    this.windowSignals.set(window, signalIds);
  }

  private focusedScopeContext(): FocusedScopeContext {
    const focused = global.display.focus_window ?? null;
    const workspace = workspaceManager().get_active_workspace();
    const workspaceIndex = workspaceManager().get_active_workspace_index();
    const monitorIndex = focused?.get_monitor() ?? Main.layoutManager.primaryIndex;
    const state = this.state.get(workspaceIndex, monitorIndex);
    const windows = this.windowsForScope(workspace, monitorIndex).filter(
      (window) => !state.floatingWindowIds.has(windowId(window)),
    );
    const ids = windows.map(windowId);
    state.orderedWindowIds = reconcileWindowOrder(state.orderedWindowIds, ids);

    return {
      focused,
      focusedId: focused ? windowId(focused) : undefined,
      state,
      windows,
    };
  }

  private windowsForScope(
    workspace: Meta.Workspace,
    monitorIndex: number,
  ): Meta.Window[] {
    return workspace
      .list_windows()
      .filter((window) => window.get_monitor() === monitorIndex)
      .filter(shouldManageWindow);
  }
}
