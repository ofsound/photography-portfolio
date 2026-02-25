<script lang="ts">
  import CmsPageView from '$lib/components/CmsPageView.svelte';

  let { data } = $props();
</script>

<CmsPageView page={data.page} />

<section class="mx-auto max-w-[900px] px-5 py-14">
  <p class="mb-6 text-sm uppercase tracking-[0.12em] text-text-muted">MVP static form (no backend integration yet).</p>

  <form class="grid gap-4" onsubmit={(event) => event.preventDefault()}>
    <label class="grid gap-1 text-xs uppercase tracking-[0.14em]">
      Name
      <input class="rounded border border-border-strong bg-transparent px-3 py-2" name="name" required />
    </label>

    <label class="grid gap-1 text-xs uppercase tracking-[0.14em]">
      Email
      <input class="rounded border border-border-strong bg-transparent px-3 py-2" name="email" type="email" required />
    </label>

    <label class="grid gap-1 text-xs uppercase tracking-[0.14em]">
      Message
      <textarea class="min-h-40 rounded border border-border-strong bg-transparent px-3 py-2" name="message" required></textarea>
    </label>

    <button type="submit" class="w-fit rounded border border-border-strong px-4 py-2 text-xs uppercase tracking-[0.14em]">Send (Not Connected Yet)</button>
  </form>
</section>
