export const autofixerQueueConfig = {
  batchSize: 5,
  queueRoot: 'src',
  sourcePatterns: ['**/*.svelte', '**/*.svelte.ts', '**/*.ts'],
  progressFile: '.svelte-autofix-progress.json',
} as const;
