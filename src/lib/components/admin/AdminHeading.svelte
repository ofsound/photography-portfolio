<script lang="ts">
  const {
    level = 1,
    class: className = '',
    children,
  } = $props<{
    level?: 1 | 2 | 3;
    class?: string;
    children: import('svelte').Snippet;
  }>();

  const headingClass = $derived.by(() => {
    const base =
      level === 1
        ? 'text-2xl font-medium tracking-wider'
        : 'text-lg tracking-wider font-medium';

    return className ? `${base} ${className}` : base;
  });
</script>

{#if level === 1}
  <h1 class={headingClass}>
    {@render children()}
  </h1>
{:else if level === 2}
  <h2 class={headingClass}>
    {@render children()}
  </h2>
{:else}
  <h3 class={headingClass}>
    {@render children()}
  </h3>
{/if}
