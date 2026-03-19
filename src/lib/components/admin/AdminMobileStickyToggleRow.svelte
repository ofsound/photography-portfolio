<script lang="ts">
  const { children } = $props<{
    children: import('svelte').Snippet;
  }>();
</script>

<!--
  Sticky is unreliable here (flex column nav + scroll parent), so on small
  screens the bar is fixed like AdminStickyActionBar. Spacer reserves height;
  md:contents hoists the inner row into the parent nav for md:order-2.
-->
<div class="md:contents">
  <div class="h-12 shrink-0 md:hidden" aria-hidden="true"></div>
  <div
    class="fixed inset-x-0 top-[var(--size-mobile-header-offset)] isolate z-40 flex justify-center border-b border-border bg-surface px-4 py-2 md:static md:inset-x-auto md:top-auto md:z-auto md:order-2 md:border-0 md:bg-transparent md:py-0"
  >
    {@render children()}
  </div>
</div>
