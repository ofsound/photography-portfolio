<script lang="ts">
  const { class: className = '', children } = $props<{
    class?: string;
    children: import('svelte').Snippet;
  }>();

  const headerClass = $derived(
    className ? `pt-0 pb-6 ${className}` : 'pt-0 pb-6',
  );
</script>

<header class={headerClass}>
  {@render children()}
</header>
