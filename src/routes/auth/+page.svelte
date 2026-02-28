<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  let { data, form } = $props();
</script>

<section class="mx-auto grid w-full max-w-[var(--max-width-form)] gap-4 px-5 py-14">
  <h1 class="text-2xl uppercase tracking-[var(--tracking-nav)]">CMS Auth</h1>

  {#if form?.message}
    <p class="rounded border border-border px-3 py-2 text-sm">{form.message}</p>
  {/if}

  {#if data.session}
    <div class="grid gap-3 rounded border border-border p-4 text-sm">
      <p>Signed in as <strong>{data.userEmail}</strong>.</p>
      <div class="flex flex-wrap items-center gap-2">
        <AdminButton href="/admin/photos">Go to Admin</AdminButton>
        <form method="POST" action="?/logout">
          <AdminButton type="submit">Sign Out</AdminButton>
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

      <AdminButton type="submit" wFit>Sign In</AdminButton>
    </form>
  {/if}
</section>
