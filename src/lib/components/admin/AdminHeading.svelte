<script lang="ts">
  const {
    level = 1,
    tag: tagOverride = undefined,
    class: className = '',
    children,
  } = $props<{
    level?: 1 | 2 | 3;
    tag?: 'h1' | 'h2' | 'h3' | 'span';
    class?: string;
    children: import('svelte').Snippet;
  }>();

  const tag = $derived<'h1' | 'h2' | 'h3' | 'span'>(
    tagOverride ?? (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'),
  );

  const headingClass = $derived.by(() => {
    let base: string;
    switch (level) {
      case 1:
        base = 'text-2xl font-semibold tracking-wider';
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

<svelte:element this={tag} class={headingClass}>
  {@render children()}
</svelte:element>
