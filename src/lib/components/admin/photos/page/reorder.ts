export const moveItem = <T>(arr: T[], from: number, to: number): T[] => {
  const clone = [...arr];
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

export const reorderBefore = (orderedIds: string[], draggedId: string, targetId: string) => {
  const from = orderedIds.indexOf(draggedId);
  const to = orderedIds.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return null;
  return moveItem(orderedIds, from, to);
};

export const reorderToEnd = (orderedIds: string[], draggedId: string) => {
  const from = orderedIds.indexOf(draggedId);
  if (from < 0) return null;
  const next = [...orderedIds];
  const [item] = next.splice(from, 1);
  next.push(item);
  return next;
};
