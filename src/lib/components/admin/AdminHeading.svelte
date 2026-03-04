<script lang="ts">
  const { children } = $props<{ children: import('svelte').Snippet }>();
</script>

<h1 class="text-2xl font-medium tracking-wider">
  {@render children()}
</h1>
