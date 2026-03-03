<script lang="ts">
  let { children } = $props<{ children: import('svelte').Snippet }>();
</script>

<h1 class="text-2xl font-medium tracking-[var(--tracking-heading)]">
  {@render children()}
</h1>
