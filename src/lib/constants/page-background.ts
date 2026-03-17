export type PageBackgroundBehavior = 'scroll' | 'fixed';

export const PAGE_BACKGROUND_OPTIONS: Array<{
  value: PageBackgroundBehavior;
  label: string;
  description: string;
}> = [
    {
      value: 'scroll',
      label: 'Scroll',
      description: 'Background moves as you scroll. Image stretches full height.',
    },
    {
      value: 'fixed',
      label: 'Fixed',
      description: 'Background stays fixed while content scrolls.',
    },
  ];
