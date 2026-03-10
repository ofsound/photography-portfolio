<script lang="ts">
  const { class: className = '', children } = $props<{
    class?: string;
    children: import('svelte').Snippet;
  }>();

  const headerClass = $derived(
    className ? `pt-0 mb-7 ${className}` : 'pt-0 mb-7',
  );
</script>

<header class={headerClass}>
  {@render children()}
</header>
