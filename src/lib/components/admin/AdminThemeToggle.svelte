<script lang="ts">
  import { adminThemeModeStore } from '$lib/stores/admin-theme-mode.svelte';
</script>

<div
  class="inline-flex items-center rounded-full border border-border bg-surface-muted p-1"
>
  <button
    type="button"
    onclick={() => adminThemeModeStore.set('system')}
    class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {adminThemeModeStore.value ===
    'system'
      ? 'bg-surface text-text shadow-sm'
      : 'text-text-muted hover:text-text'}"
    aria-label="System preference"
    title="System preference"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  </button>
  <button
    type="button"
    onclick={() => adminThemeModeStore.set('light')}
    class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {adminThemeModeStore.value ===
    'light'
      ? 'bg-surface text-text shadow-sm'
      : 'text-text-muted hover:text-text'}"
    aria-label="Light mode"
    title="Light mode"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4"></circle>
      <line x1="12" y1="2" x2="12" y2="4"></line>
      <line x1="12" y1="20" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line>
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="4" y2="12"></line>
      <line x1="20" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line>
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"></line>
    </svg>
  </button>
  <button
    type="button"
    onclick={() => adminThemeModeStore.set('dark')}
    class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {adminThemeModeStore.value ===
    'dark'
      ? 'bg-surface text-text shadow-sm'
      : 'text-text-muted hover:text-text'}"
    aria-label="Dark mode"
    title="Dark mode"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"></path>
    </svg>
  </button>
</div>
