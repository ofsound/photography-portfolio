<script lang="ts">
  let { data, form } = $props();
</script>

<section class="mx-auto grid w-full max-w-[520px] gap-4 px-5 py-14">
  <h1 class="text-2xl uppercase tracking-[0.16em]">CMS Auth</h1>

  {#if form?.message}
    <p class="rounded border border-border px-3 py-2 text-sm">{form.message}</p>
  {/if}

  {#if data.session}
    <div class="grid gap-3 rounded border border-border p-4 text-sm">
      <p>Signed in as <strong>{data.userEmail}</strong>.</p>
      <div class="flex flex-wrap items-center gap-2">
        <a href="/admin" class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]">Go to Admin</a>
        <form method="POST" action="?/logout">
          <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Sign Out</button>
        </form>
      </div>
    </div>
  {:else}
    <form method="POST" action="?/login" class="grid gap-3 rounded border border-border p-4">
      <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
        Email
        <input name="email" type="email" required class="rounded border border-border-strong px-3 py-2" />
      </label>

      <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
        Password
        <input name="password" type="password" required class="rounded border border-border-strong px-3 py-2" />
      </label>

      <button class="w-fit rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Sign In</button>
    </form>
  {/if}
</section>
