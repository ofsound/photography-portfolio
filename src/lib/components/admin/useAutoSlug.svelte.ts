import { slugify } from '$lib/utils/slug';

type SyncKeys = {
  name: string;
  slug: string;
};

const DEFAULT_SYNC_KEYS: SyncKeys = {
  name: 'name',
  slug: 'slug',
};

export const useAutoSlug = (initial?: { name?: string; slug?: string }) => {
  const state = $state({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    hasManualSlugEdit: (initial?.slug ?? '').trim().length > 0,
  });

  const onNameInput = (event: Event) => {
    state.name = (event.currentTarget as HTMLInputElement).value;
    if (!state.hasManualSlugEdit) {
      state.slug = slugify(state.name);
    }
  };

  const onSlugInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    state.hasManualSlugEdit = value.trim().length > 0;
    state.slug = state.hasManualSlugEdit ? value : slugify(state.name);
  };

  const syncFromValues = (
    values: Record<string, unknown> | undefined,
    keys: SyncKeys = DEFAULT_SYNC_KEYS,
  ) => {
    if (!values) return;

    const nextName = values[keys.name];
    if (typeof nextName === 'string') {
      state.name = nextName;
    }

    const nextSlug = values[keys.slug];
    if (typeof nextSlug === 'string') {
      state.slug = nextSlug;
      state.hasManualSlugEdit = nextSlug.trim().length > 0;
    }
  };

  return {
    get name() {
      return state.name;
    },
    set name(value: string) {
      state.name = value;
    },
    get slug() {
      return state.slug;
    },
    set slug(value: string) {
      state.slug = value;
    },
    get hasManualSlugEdit() {
      return state.hasManualSlugEdit;
    },
    onNameInput,
    onSlugInput,
    syncFromValues,
  };
};
