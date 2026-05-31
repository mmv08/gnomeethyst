import { DEFAULT_LAYOUT_CYCLE } from '../layouts/registry';
import type { LayoutKey } from '../layouts/types';

/**
 * Session-state bucket for one workspace/monitor pair.
 */
export type ScopeKey = `${number}:${number}`;

/**
 * Mutable state Gnomeethyst owns for one tiling scope.
 *
 * @remarks
 * Window membership is still rebuilt from GNOME on every reflow. This state
 * stores only order, layout choice, and session-local floating decisions.
 */
export type ScopeState = {
  layoutKey: LayoutKey;
  orderedWindowIds: string[];
  floatingWindowIds: Set<string>;
};

/**
 * Lazily creates workspace/monitor state.
 *
 * @remarks
 * Workspace indexes are intentionally simple for the MVP. If dynamic workspace
 * identity becomes a problem, this is the narrow place to evolve the key.
 */
export class WorkspaceStateStore {
  private readonly scopes = new Map<ScopeKey, ScopeState>();

  get(workspaceIndex: number, monitorIndex: number): ScopeState {
    const key = `${workspaceIndex}:${monitorIndex}` as ScopeKey;
    let state = this.scopes.get(key);
    if (!state) {
      state = {
        layoutKey: DEFAULT_LAYOUT_CYCLE[0]!,
        orderedWindowIds: [],
        floatingWindowIds: new Set(),
      };
      this.scopes.set(key, state);
    }
    return state;
  }

  reset(): void {
    this.scopes.clear();
  }
}
