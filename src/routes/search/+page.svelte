<script lang="ts">
  let { data } = $props();
</script>

<section class="mx-auto max-w-[1300px] px-5 py-10">
  <form class="mb-6" method="get">
    <input
      name="q"
      value={data.q}
      placeholder="Search photographs"
      class="w-full rounded border border-black/20 bg-transparent px-3 py-2"
    />
  </form>

  {#if data.q && data.results.length === 0}
    <p class="text-sm uppercase tracking-[0.14em] text-ink/70">No results.</p>
  {/if}

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each data.results as result (result.id)}
      <a href={`/photo/${result.slug}`} class="rounded border border-black/10 p-4 transition hover:border-black/30">
        <h2 class="text-sm uppercase tracking-[0.14em]">{result.title}</h2>
        {#if result.description}
          <p class="mt-2 text-sm text-ink/70 line-clamp-3">{result.description}</p>
        {/if}
      </a>
    {/each}
  </div>
</section>
