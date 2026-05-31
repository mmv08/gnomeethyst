/**
 * Preserves known window order while admitting newly visible windows.
 *
 * @remarks
 * GNOME is the source of truth for which windows currently exist; this helper
 * only preserves the user-visible order choices Gnomeethyst owns.
 *
 * @example
 * reconcileWindowOrder(['b', 'a', 'missing'], ['a', 'b', 'c'])
 * // => ['b', 'a', 'c']
 */
export function reconcileWindowOrder(
  existingIds: string[],
  visibleIds: string[],
): string[] {
  const visible = new Set(visibleIds);
  const preserved = existingIds.filter((id) => visible.has(id));
  const known = new Set(preserved);
  const added = visibleIds.filter((id) => !known.has(id));
  return [...preserved, ...added];
}

/**
 * Wraps indexes for cyclic focus and swap operations.
 *
 * @internal
 */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return -1;
  return ((index % length) + length) % length;
}

/**
 * Selects the neighboring id in a cyclic window order.
 *
 * @internal
 */
export function nextIdInOrder(
  ids: string[],
  currentId: string | undefined,
  delta: -1 | 1,
): string | undefined {
  if (ids.length === 0) return undefined;
  const index = currentId ? ids.indexOf(currentId) : -1;
  return ids[wrapIndex(index + delta, ids.length)];
}

/**
 * Swaps the focused window with its cyclic neighbor.
 *
 * @internal
 */
export function swapInOrder(
  ids: string[],
  currentId: string,
  delta: -1 | 1,
): string[] {
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1 || ids.length < 2) return ids;

  const otherIndex = wrapIndex(currentIndex + delta, ids.length);
  const next = [...ids];
  const current = next[currentIndex]!;
  next[currentIndex] = next[otherIndex]!;
  next[otherIndex] = current;
  return next;
}

/**
 * Promotes the focused window into the main position.
 *
 * @internal
 */
export function swapWithMain(ids: string[], currentId: string): string[] {
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex <= 0) return ids;

  const next = [...ids];
  next[currentIndex] = next[0]!;
  next[0] = currentId;
  return next;
}
