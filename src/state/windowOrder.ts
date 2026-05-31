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

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return -1;
  return ((index % length) + length) % length;
}

export function nextIdInOrder(
  ids: string[],
  currentId: string | undefined,
  delta: -1 | 1,
): string | undefined {
  if (ids.length === 0) return undefined;
  const index = currentId ? ids.indexOf(currentId) : -1;
  return ids[wrapIndex(index + delta, ids.length)];
}

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

export function swapWithMain(ids: string[], currentId: string): string[] {
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex <= 0) return ids;

  const next = [...ids];
  next[currentIndex] = next[0]!;
  next[0] = currentId;
  return next;
}
