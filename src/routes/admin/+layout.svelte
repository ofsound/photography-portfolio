<script lang="ts">
  import { page } from '$app/state';

  let { data, children } = $props();

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

<div class="grid min-h-[calc(100vh-64px)] grid-cols-[240px_1fr]">
  <aside class="border-r border-border p-4">
    <p class="mb-5 text-xs uppercase tracking-[var(--tracking-heading)]">({data.role})</p>
    <nav class="grid gap-2 text-sm">
      {#each links as link}
        <a href={link.href} class:underline={isActiveLink(link.href)}>{link.label}</a>
      {/each}
    </nav>
  </aside>

  <section class="p-6">{@render children()}</section>
</div>
