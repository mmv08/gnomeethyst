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

/**
 * Short enough to feel immediate, long enough to collapse GNOME's bursty window
 * signals during app startup.
 */
const REFLOW_DEBOUNCE_MS = 80;
const MAIN_PANE_RATIO_STEP = 0.05;

/**
 * Returns the workspace manager across the camelCase/snake_case GJS transition.
 *
 * @internal
 */
function workspaceManager(): {
  get_active_workspace_index(): number;
  get_active_workspace(): Meta.Workspace;
  connect(signal: string, callback: (...args: unknown[]) => void): number;
  disconnect(id: number): void;
} {
  return ((global as unknown as { workspaceManager?: unknown }).workspaceManager ??
    (global as unknown as { workspace_manager: unknown }).workspace_manager) as ReturnType<
    typeof workspaceManager
  >;
}

/**
 * Returns the shell window manager across the camelCase/snake_case GJS transition.
 *
 * @internal
 */
function windowManager(): WindowManagerLike {
  return ((global as unknown as { windowManager?: unknown }).windowManager ??
    (global as unknown as { window_manager: unknown }).window_manager) as WindowManagerLike;
}

/**
 * Converts GNOME's rectangle object into the pure layout rectangle type.
 *
 * @internal
 */
function rectFromMtk(rect: Mtk.Rectangle): Rect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Coordinates GNOME Shell window state with the pure layout engine.
 *
 * @remarks
 * The controller is the boundary between unstable Shell signals and stable
 * layout math. It rebuilds visible window order from GNOME state when possible,
 * persists only the small amount of session state we need, and debounces reflow
 * because apps often emit create/show/size/position signals in quick succession.
 */
export class ReflowController {
  private readonly signals = new SignalStore();
  private readonly state = new WorkspaceStateStore();
  private readonly windowSignals = new Map<Meta.Window, number[]>();
  private reflowTimerId = 0;
  private applyingFrames = false;
  private layoutChangedCallback: ((layoutName: string, enabled: boolean) => void) | null = null;

  constructor(private readonly settings: GnomeethystSettings) {}

  /**
   * Hooks global Shell signals and starts managing existing windows.
   *
   * @remarks
   * `workareas-changed` lives on `global.display` in GNOME Shell 50; using the
   * wrong object leaves partially initialized UI behind during extension reload.
   */
  enable(): void {
    this.signals.connect(global.display, 'window-created', (_display, window) => {
      this.watchWindow(window as Meta.Window);
      this.scheduleReflow();
    });
    this.signals.connect(workspaceManager(), 'active-workspace-changed', () =>
      this.scheduleReflow(),
    );
    this.signals.connect(global.display, 'workareas-changed', () => this.scheduleReflow());
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
      this.signals.connect(this.settings.settings, `changed::${key}`, () => this.scheduleReflow());
    });

    global.get_window_actors().forEach((actor) => {
      this.watchWindow(actor.metaWindow);
    });
    this.scheduleReflow();
  }

  /**
   * Registers a UI callback for layout/status changes.
   */
  onLayoutChanged(callback: (layoutName: string, enabled: boolean) => void): void {
    this.layoutChangedCallback = callback;
    this.emitLayoutChanged();
  }

  /**
   * Disconnects all Shell signals and clears session-only layout state.
   */
  destroy(): void {
    if (this.reflowTimerId) {
      GLib.source_remove(this.reflowTimerId);
      this.reflowTimerId = 0;
    }
    this.windowSignals.forEach((signalIds, window) => {
      signalIds.forEach((signalId) => {
        window.disconnect(signalId);
      });
    });
    this.windowSignals.clear();
    this.signals.disconnectAll();
    this.state.reset();
  }

  /**
   * Schedules a debounced layout pass.
   *
   * @remarks
   * Calls made while applying frames are ignored to avoid reacting to our own
   * `move_resize_frame()` operations.
   */
  scheduleReflow(): void {
    if (this.applyingFrames) return;
    if (this.reflowTimerId) GLib.source_remove(this.reflowTimerId);

    this.reflowTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, REFLOW_DEBOUNCE_MS, () => {
      this.reflowTimerId = 0;
      this.reflow();
      return GLib.SOURCE_REMOVE;
    });
  }

  /**
   * Persists and activates a specific layout.
   */
  selectLayout(layoutKey: LayoutKey): void {
    this.settings.currentLayout = layoutKey;
    this.scheduleReflow();
  }

  /**
   * Moves through the configured layout cycle.
   */
  cycleLayout(direction: -1 | 1): void {
    const cycle = this.settings.layoutCycle;
    const current = this.settings.currentLayout;
    const currentIndex = Math.max(0, cycle.indexOf(current));
    const nextIndex = (currentIndex + direction + cycle.length) % cycle.length;
    this.selectLayout(cycle[nextIndex]!);
  }

  /**
   * Adjusts the main pane ratio by the Amethyst-style resize step.
   */
  resizeMainPane(delta: number): void {
    this.settings.mainPaneRatio =
      this.settings.layoutState.mainPaneRatio + delta * MAIN_PANE_RATIO_STEP;
    this.scheduleReflow();
  }

  /**
   * Adjusts the number of windows assigned to the main pane.
   */
  changeMainPaneCount(delta: number): void {
    this.settings.mainPaneCount = this.settings.layoutState.mainPaneCount + delta;
    this.scheduleReflow();
  }

  /**
   * Focuses the next or previous tiled window in managed order.
   *
   * @remarks
   * The active scope is reconciled first so a key press immediately after a new
   * window appears does not depend on a previous reflow having completed.
   */
  focusWindow(delta: -1 | 1): void {
    const { focusedId, state, windows } = this.focusedScopeContext();
    const nextId = nextIdInOrder(state.orderedWindowIds, focusedId, delta);
    const nextWindow = nextId ? windows.find((window) => windowId(window) === nextId) : undefined;
    if (nextWindow) Main.activateWindow(nextWindow, global.get_current_time());
  }

  /**
   * Swaps the focused window with its neighbor in managed order.
   */
  swapWindow(delta: -1 | 1): void {
    const { focusedId, state } = this.focusedScopeContext();
    if (!focusedId) return;

    state.orderedWindowIds = swapInOrder(state.orderedWindowIds, focusedId, delta);
    this.scheduleReflow();
  }

  /**
   * Promotes the focused window to the main pane.
   */
  swapFocusedWithMain(): void {
    const { focusedId, state } = this.focusedScopeContext();
    if (!focusedId) return;

    state.orderedWindowIds = swapWithMain(state.orderedWindowIds, focusedId);
    this.scheduleReflow();
  }

  /**
   * Toggles session-local floating state for the focused window.
   */
  toggleFloat(): void {
    const { focused, state } = this.focusedScopeContext();
    if (!focused || !shouldManageWindow(focused)) return;

    const id = windowId(focused);
    if (state.floatingWindowIds.has(id)) state.floatingWindowIds.delete(id);
    else state.floatingWindowIds.add(id);
    this.scheduleReflow();
  }

  /**
   * Toggles whether Gnomeethyst actively applies layouts.
   */
  toggleTiling(): void {
    this.settings.tilingEnabled = !this.settings.tilingEnabled;
    this.scheduleReflow();
  }

  /**
   * Shows a transient Shell notification for the current layout state.
   */
  displayCurrentLayout(): void {
    const layout = getLayout(this.settings.currentLayout);
    Main.notify('Gnomeethyst', `${layout.name}${this.settings.tilingEnabled ? '' : ' (off)'}`);
    this.emitLayoutChanged();
  }

  /**
   * Computes and applies frames for all managed windows on active workspace monitors.
   *
   * @remarks
   * Reflow is intentionally pull-based: every pass asks GNOME for currently
   * visible windows, reconciles the saved order, and derives assignments from
   * pure layout code. This keeps recovery simple after app crashes, late Chrome
   * placement changes, or monitor/workarea updates.
   */
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
        const workArea = rectFromMtk(Main.layoutManager.getWorkAreaForMonitor(monitorIndex));
        const managedWindows: ManagedWindow[] = orderedWindows.map((window) => ({
          id: windowId(window),
          isFocused: window === global.display.focus_window,
        }));
        const layout = getLayout(state.layoutKey);
        const assignments = layout.assign(managedWindows, workArea, this.settings.layoutState);

        orderedWindows.forEach((window) => {
          const rect = assignments.get(windowId(window));
          if (!rect) return;
          applyWindowFrame(window, rect, workArea, {
            innerGap: this.settings.innerGap,
            outerGap: this.settings.outerGap,
          });
        });

        if (state.layoutKey === 'fullscreen' && global.display.focus_window) {
          Main.activateWindow(global.display.focus_window, global.get_current_time());
        }
      });
    } finally {
      this.applyingFrames = false;
    }
  }

  /**
   * Emits the current layout status to the panel indicator.
   */
  private emitLayoutChanged(): void {
    const layout = getLayout(this.settings.currentLayout);
    this.layoutChangedCallback?.(layout.name, this.settings.tilingEnabled);
  }

  /**
   * Watches a window for lifecycle and late-placement events.
   *
   * @remarks
   * Chrome can resize to the requested frame but later recenter itself during
   * startup. Listening to `shown`, `position-changed`, and `size-changed` lets
   * the debounced reflow correct that final position without app-specific code.
   */
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

  /**
   * Returns reconciled state and windows for the focused monitor/workspace.
   */
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

  /**
   * Lists windows that belong to one workspace/monitor tiling scope.
   */
  private windowsForScope(workspace: Meta.Workspace, monitorIndex: number): Meta.Window[] {
    return workspace
      .list_windows()
      .filter((window) => window.get_monitor() === monitorIndex)
      .filter(shouldManageWindow);
  }
}
