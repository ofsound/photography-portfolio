export const NAV_BUTTON_PRESET_OPTIONS = [
  {
    id: 'whisper',
    label: 'Whisper',
    description: 'Minimal editorial chevron — thin stroke, no background.',
  },
  {
    id: 'lens',
    label: 'Lens',
    description: 'Circular aperture-ring button with spring hover.',
  },
  {
    id: 'filmStrip',
    label: 'Film Strip',
    description: 'Sprocket-hole edge bar inspired by 35mm film.',
  },
  {
    id: 'cinemark',
    label: 'Cinemark',
    description: 'Bold typographic arrow — raw, weightful, no container.',
  },
  {
    id: 'gate',
    label: 'Gate',
    description: 'Full-height curtain edge that widens on hover.',
  },
] as const;

export type NavButtonPreset = (typeof NAV_BUTTON_PRESET_OPTIONS)[number]['id'];

export const DEFAULT_NAV_BUTTON_PRESET: NavButtonPreset = 'whisper';

const NAV_BUTTON_PRESET_SET = new Set<NavButtonPreset>(
  NAV_BUTTON_PRESET_OPTIONS.map((option) => option.id),
);

const isNavButtonPreset = (value: unknown): value is NavButtonPreset =>
  typeof value === 'string' &&
  NAV_BUTTON_PRESET_SET.has(value as NavButtonPreset);

export const normalizeNavButtonPreset = (value: unknown): NavButtonPreset =>
  isNavButtonPreset(value) ? value : DEFAULT_NAV_BUTTON_PRESET;
