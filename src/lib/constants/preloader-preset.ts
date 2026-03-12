export const PRELOADER_PRESET_OPTIONS = [
    {
        id: 'minimal',
        label: 'Minimal',
        description: 'Simple fade overlay with progress bar.',
    },
    {
        id: 'curtain',
        label: 'Curtain',
        description: 'Split panels slide in from edges, part to reveal.',
    },
    {
        id: 'iris',
        label: 'Iris',
        description: 'Circular mask expands from center like a camera aperture.',
    },
    {
        id: 'veil',
        label: 'Veil',
        description: 'Soft gradient descends, dissolves upward with blur.',
    },
    {
        id: 'diagonal',
        label: 'Diagonal',
        description: 'Triangular panels sweep in from opposing corners.',
    },
    {
        id: 'filmBurn',
        label: 'Film Burn',
        description: 'White-hot flash settles, then burns away to reveal.',
    },
] as const;

export type PreloaderPreset =
    (typeof PRELOADER_PRESET_OPTIONS)[number]['id'];

export const DEFAULT_PRELOADER_PRESET: PreloaderPreset = 'minimal';

const PRELOADER_PRESET_SET = new Set<PreloaderPreset>(
    PRELOADER_PRESET_OPTIONS.map((option) => option.id),
);

const isPreloaderPreset = (value: unknown): value is PreloaderPreset =>
    typeof value === 'string' &&
    PRELOADER_PRESET_SET.has(value as PreloaderPreset);

export const normalizePreloaderPreset = (value: unknown): PreloaderPreset =>
    isPreloaderPreset(value) ? value : DEFAULT_PRELOADER_PRESET;
