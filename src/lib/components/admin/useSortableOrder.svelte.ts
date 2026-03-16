import { isSortable } from '@dnd-kit/svelte/sortable';

type SortableEvent = {
  canceled?: boolean;
  operation?: { source: unknown };
};

type UseSortableOrderOptions = {
  getBaseIds: () => string[];
  persist: (next: string[]) => Promise<void>;
  onPersisted?: () => Promise<void> | void;
};

export const useSortableOrder = ({
  getBaseIds,
  persist,
  onPersisted,
}: UseSortableOrderOptions) => {
  let pendingOrder = $state<string[] | null>(null);
  let isSaving = $state(false);

  const orderedIds = $derived(pendingOrder ?? getBaseIds());

  const onDragEnd = async (event: unknown) => {
    if (isSaving) return;

    const e = event as SortableEvent;
    if (e.canceled || !e.operation?.source) return;

    const source = e.operation.source as Parameters<typeof isSortable>[0];
    if (!isSortable(source)) return;

    const { initialIndex, index } = source as {
      initialIndex: number;
      index: number;
    };

    if (initialIndex === index) return;

    const next = [...orderedIds];
    const [removed] = next.splice(initialIndex, 1);
    next.splice(index, 0, removed);
    pendingOrder = next;

    isSaving = true;
    try {
      await persist(next);
      await onPersisted?.();
    } finally {
      isSaving = false;
      pendingOrder = null;
    }
  };

  return {
    get orderedIds() {
      return orderedIds;
    },
    get isSaving() {
      return isSaving;
    },
    onDragEnd,
  };
};
