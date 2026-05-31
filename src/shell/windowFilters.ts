import Meta from 'gi://Meta';

const fallbackWindowIds = new WeakMap<Meta.Window, string>();
let nextFallbackWindowId = 1;

/**
 * Decides whether Gnomeethyst should manage a GNOME Shell window.
 *
 * @remarks
 * The filter is intentionally conservative. Dialogs, transient windows,
 * override-redirect surfaces, and skip-taskbar utility windows are more likely
 * to break workflows when tiled than when left floating.
 */
export function shouldManageWindow(window: Meta.Window): boolean {
  const candidate = window as Meta.Window & {
    is_override_redirect?: () => boolean;
    is_skip_taskbar?: () => boolean;
    skip_taskbar?: boolean;
    skipTaskbar?: boolean;
  };

  return (
    window.windowType === Meta.WindowType.NORMAL &&
    !window.minimized &&
    window.get_transient_for() === null &&
    !window.is_attached_dialog() &&
    candidate.is_override_redirect?.() !== true &&
    candidate.is_skip_taskbar?.() !== true &&
    candidate.skip_taskbar !== true &&
    candidate.skipTaskbar !== true
  );
}

/**
 * Produces a stable id for preserving order and floating state.
 *
 * @remarks
 * Prefer Mutter's stable sequence when available, fall back to older window ids,
 * and finally use a `WeakMap` identity. The `WeakMap` fallback is deliberately
 * not geometry-based: geometry changes during tiling, and using it as identity
 * would make order state drift.
 */
export function windowId(window: Meta.Window): string {
  const candidate = window as Meta.Window & {
    get_stable_sequence?: () => number;
    get_id?: () => number;
  };
  const stableSequence = candidate.get_stable_sequence?.();
  if (stableSequence !== undefined) return stableSequence.toString();

  const legacyId = candidate.get_id?.();
  if (legacyId !== undefined) return `${window.get_pid()}:${legacyId}`;

  let fallbackId = fallbackWindowIds.get(window);
  if (!fallbackId) {
    fallbackId = `${window.get_pid()}:fallback-${nextFallbackWindowId}`;
    nextFallbackWindowId += 1;
    fallbackWindowIds.set(window, fallbackId);
  }

  return fallbackId;
}
