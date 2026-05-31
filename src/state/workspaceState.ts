import { DEFAULT_LAYOUT_CYCLE } from '../layouts/registry';
import type { LayoutKey } from '../layouts/types';

export type ScopeKey = `${number}:${number}`;

export type ScopeState = {
  layoutKey: LayoutKey;
  orderedWindowIds: string[];
  floatingWindowIds: Set<string>;
};

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
