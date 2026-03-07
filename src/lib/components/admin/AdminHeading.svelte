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
    let base: string;
    switch (level) {
      case 1:
        base = 'text-2xl font-medium tracking-wider';
        break;
      case 2:
        base = 'text-lg tracking-wider font-medium';
        break;
      default:
        base = 'text-sm tracking-widest uppercase';
    }
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
