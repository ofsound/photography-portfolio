<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';

  const { data, form } = $props();
  const fieldErrors = $derived(form?.fieldErrors ?? {});
  const values = $derived(form?.values ?? {});
</script>

<section class="mx-auto grid w-full max-w-lg gap-4 px-5 py-14">
  <h1 class="text-2xl tracking-widest uppercase">CMS Auth</h1>

  {#if form?.message}
    <AdminStatusMessage
      type={form && 'success' in form && form.success ? 'success' : 'error'}
    >
      {form.message}
    </AdminStatusMessage>
  {/if}

  {#if data.session}
    <div class="grid gap-3 rounded border border-border p-4 text-sm">
      <p>Signed in as <strong>{data.userEmail}</strong>.</p>
      <div class="flex flex-wrap items-center gap-2">
        <AdminButton href="/admin/galleries">Go to Admin</AdminButton>
        <form method="POST" action="?/logout">
          <AdminButton type="submit">Sign Out</AdminButton>
        </form>
      </div>
    </div>
  {:else}
    <form
      method="POST"
      action="?/login"
      class="grid gap-3 rounded border border-border p-4"
    >
      <FormField
        label="Email"
        id="auth-email"
        required
        error={fieldErrors.email}
      >
        <FormInput
          id="auth-email"
          name="email"
          type="email"
          value={values.email ?? ''}
        />
      </FormField>
      <FormField
        label="Password"
        id="auth-password"
        required
        error={fieldErrors.password}
      >
        <FormInput id="auth-password" name="password" type="password" />
      </FormField>

      <AdminButton type="submit">Sign In</AdminButton>
    </form>
  {/if}
</section>
