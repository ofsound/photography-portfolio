<script lang="ts">
  import { page } from '$app/state';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';

  const { data, children } = $props();

  const links = [
    { href: '/admin/photos', label: 'Photos' },
    { href: '/admin/categories', label: 'Categories' },
    { href: '/admin/tags', label: 'Tags' },
    { href: '/admin/homepage', label: 'Homepage' },
    { href: '/admin/pages', label: 'Pages' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/audit', label: 'Audit' }
  ];

  const isActiveLink = (href: string) => {
    if (href === '/admin/photos') {
      return page.url.pathname === '/admin/photos' || page.url.pathname.startsWith('/admin/photos/');
    }
    return page.url.pathname === href;
  };
</script>

<div class="grid min-h-[calc(100vh-var(--site-header-height))] grid-cols-[240px_1fr]">
  <aside class="border-r border-border" style="view-transition-name: admin-sidebar">
    <p class="mb-5 p-4 text-xl uppercase tracking-[var(--tracking-heading)]">{data.role}</p>
    <nav class="flex flex-col border-y border-border text-lg font-medium">
      {#each links as link, i (link.href)}
        <div
          class="relative flex items-center justify-between border-t border-border first:border-t-0"
          class:bg-surface-muted={!isActiveLink(link.href) && i % 2 === 1}
          class:bg-surface-strong={isActiveLink(link.href)}
        >
          <a href={link.href} class="absolute inset-0 z-0" aria-label={link.label}></a>
          <span class="pointer-events-none z-10 px-4 py-3">{link.label}</span>
          {#if link.href === '/admin/photos'}
            <div class="relative z-20 pr-4">
              <AdminButton href="/admin/photos/create" variant="submit" size="xs">
                Add New
              </AdminButton>
            </div>
          {/if}
        </div>
      {/each}
    </nav>
  </aside>

  <section class="p-6" style="view-transition-name: admin-content">{@render children()}</section>
</div>
