export type PhotoDraftState = {
  orderedAdditionalByPhoto: Record<string, string[]>;
  taxonomyDraftCategories: string[];
  taxonomyDraftTags: string[];
};

type HistoryInput = {
  undoStack: PhotoDraftState[];
  redoStack: PhotoDraftState[];
  currentState: PhotoDraftState;
  limit: number;
};

type HistoryResult = {
  undoStack: PhotoDraftState[];
  redoStack: PhotoDraftState[];
  appliedState: PhotoDraftState | null;
};

export const cloneOrderedAdditional = (state: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(state).map(([photoId, imageIds]) => [photoId, [...imageIds]]));

export const clonePhotoDraftState = (state: PhotoDraftState): PhotoDraftState => ({
  orderedAdditionalByPhoto: cloneOrderedAdditional(state.orderedAdditionalByPhoto),
  taxonomyDraftCategories: [...state.taxonomyDraftCategories],
  taxonomyDraftTags: [...state.taxonomyDraftTags]
});

export const createPhotoDraftState = (
  orderedAdditionalByPhoto: Record<string, string[]>,
  taxonomyDraftCategories: string[],
  taxonomyDraftTags: string[]
): PhotoDraftState => ({
  orderedAdditionalByPhoto: cloneOrderedAdditional(orderedAdditionalByPhoto),
  taxonomyDraftCategories: [...taxonomyDraftCategories],
  taxonomyDraftTags: [...taxonomyDraftTags]
});

export const pushDraftHistory = ({
  undoStack,
  redoStack: _redoStack,
  currentState,
  limit
}: HistoryInput): HistoryResult => ({
  undoStack: [...undoStack, clonePhotoDraftState(currentState)].slice(-limit),
  redoStack: [],
  appliedState: null
});

export const undoDraftHistory = ({ undoStack, redoStack, currentState, limit }: HistoryInput): HistoryResult => {
  if (undoStack.length === 0) {
    return { undoStack, redoStack, appliedState: null };
  }

  const previous = clonePhotoDraftState(undoStack[undoStack.length - 1]);
  return {
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, clonePhotoDraftState(currentState)].slice(-limit),
    appliedState: previous
  };
};

export const redoDraftHistory = ({ undoStack, redoStack, currentState, limit }: HistoryInput): HistoryResult => {
  if (redoStack.length === 0) {
    return { undoStack, redoStack, appliedState: null };
  }

  const next = clonePhotoDraftState(redoStack[redoStack.length - 1]);
  return {
    undoStack: [...undoStack, clonePhotoDraftState(currentState)].slice(-limit),
    redoStack: redoStack.slice(0, -1),
    appliedState: next
  };
};
