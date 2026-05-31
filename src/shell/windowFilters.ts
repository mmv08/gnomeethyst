import Meta from 'gi://Meta';

const fallbackWindowIds = new WeakMap<Meta.Window, string>();
let nextFallbackWindowId = 1;

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
