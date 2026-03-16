<script lang="ts">
  const baseClass =
    '-m-2 p-2 text-text-muted transition-colors hover:text-brand';

  const {
    href,
    ariaLabel,
    class: className = '',
  } = $props<{
    href: string;
    ariaLabel: string;
    class?: string;
  }>();

  const linkClass = $derived(
    className ? `${baseClass} ${className}` : baseClass,
  );
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a {href} class={linkClass} aria-label={ariaLabel}>
  <svg
    class="size-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 3 5 8l5 5" />
  </svg>
</a>
