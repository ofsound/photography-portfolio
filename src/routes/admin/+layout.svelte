<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  const { data, children } = $props();

  const links = $derived.by(() => {
    const list = [
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/tags', label: 'Tags' },
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/settings/defaults', label: 'Defaults' },
      { href: '/admin/audit', label: 'Audit' },
    ];

    if (data.role === 'admin') {
      list.unshift({ href: '/admin/galleries', label: 'Galleries' });
    }

    return list;
  });

  const isActiveLink = (href: string) => {
    if (href === '/admin/all/photos') {
      return (
        page.url.pathname === '/admin/all/photos' ||
        page.url.pathname.startsWith('/admin/all/photos/') ||
        /^\/admin\/[^/]+\/photos(?:\/.*)?$/.test(page.url.pathname)
      );
    }
    if (href === '/admin/settings/defaults') {
      return page.url.pathname === '/admin/settings/defaults';
    }
    return page.url.pathname === href;
  };
</script>

<div
  class="grid h-[calc(100vh-var(--site-header-height))] grid-cols-[240px_1fr]"
  style="--font-sans: var(--font-sans-admin); font-family: var(--font-sans)"
>
  <aside
    class="border-r border-border"
    style="view-transition-name: admin-sidebar"
  >
    <p class="mb-5 p-4 text-xl tracking-wider uppercase">
      {data.role}
    </p>
    <nav class="flex flex-col border-y border-border text-lg font-medium">
      {#each links as link, i (link.href)}
        <div
          class="relative flex items-center justify-between border-t border-border first:border-t-0"
          class:bg-surface-muted={!isActiveLink(link.href) && i % 2 === 1}
          class:bg-surface-strong={isActiveLink(link.href)}
        >
          <a
            href={resolve(link.href as `/${string}`)}
            class="absolute inset-0 z-0"
            aria-label={link.label}
          ></a>
          <span class="pointer-events-none z-10 px-4 py-3">{link.label}</span>
        </div>
      {/each}
    </nav>
  </aside>

  <section
    class="flex min-h-0 flex-col overflow-y-auto p-6"
    style="view-transition-name: admin-content"
  >
    {@render children()}
  </section>
</div>
