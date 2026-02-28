<script lang="ts">
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

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
        <a href="/admin/photos" class="rounded border border-admin-btn-border bg-admin-btn-bg px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-border">Go to Admin</a>
        <form method="POST" action="?/logout">
          <button class="rounded border border-admin-btn-border bg-admin-btn-bg px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-border" type="submit">Sign Out</button>
        </form>
      </div>
    </div>
  {:else}
    <form method="POST" action="?/login" class="grid gap-3 rounded border border-border p-4">
      <FormField label="Email" id="auth-email">
        <FormInput id="auth-email" name="email" type="email" required />
      </FormField>
      <FormField label="Password" id="auth-password">
        <FormInput id="auth-password" name="password" type="password" required />
      </FormField>

      <button class="w-fit rounded border border-admin-btn-border bg-admin-btn-bg px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-border" type="submit">Sign In</button>
    </form>
  {/if}
</section>
