<script lang="ts">
  const { children } = $props<{
    children: import('svelte').Snippet;
  }>();
</script>

<div
  class="sticky top-[var(--size-mobile-header-offset)] z-40 -mx-4 flex justify-center border-b border-border bg-bg px-4 py-2 md:static md:top-auto md:z-auto md:order-2 md:mx-0 md:border-0 md:bg-transparent md:py-0"
>
  {@render children()}
</div>
