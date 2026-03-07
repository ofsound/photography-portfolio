<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  const { data, children } = $props();

  const links = $derived.by(() => {
    const list = [
      { href: '/admin/library', label: 'Library' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/tags', label: 'Tags' },
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/audit', label: 'Audit' },
    ];

    if (data.role === 'admin') {
      list.unshift({ href: '/admin/galleries', label: 'Galleries' });
    }

    return list;
  });

  const isActiveLink = (href: string) => {
    if (href === '/admin/library') {
      return (
        page.url.pathname === '/admin/library' ||
        page.url.pathname.startsWith('/admin/library/')
      );
    }
    if (href === '/admin/galleries') {
      return (
        page.url.pathname === '/admin/galleries' ||
        /^\/admin\/(?!library\/?$|library\/)([^/]+)\/(?:photos(?:\/.*)?|details(?:\/.*)?)$/.test(
          page.url.pathname,
        )
      );
    }
    return page.url.pathname === href;
  };
</script>

<div
  class="grid h-[calc(100vh-var(--site-header-height))] grid-cols-[220px_1fr]"
  style="--font-sans: var(--font-sans-admin); font-family: var(--font-sans)"
>
  <aside
    class="border-r border-border"
    style="view-transition-name: admin-sidebar"
  >
    <div class="relative bg-surface-muted">
      <!-- Diagonal stripes -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,var(--color-admin-diagonal)_6px,var(--color-admin-diagonal)_8px)]"
      ></div>
      <p
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase [text-shadow:0_1px_0_rgba(255,255,255,0.2),0_2px_2px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.15)]"
      >
        CMS
      </p>
    </div>
    <nav class="text-md flex flex-col border-y border-border font-medium">
      {#each links as link, i (link.href)}
        <div
          class="relative flex items-center justify-between border-t border-border transition-shadow duration-300 first:border-t-0"
          class:bg-surface-subtle={!isActiveLink(link.href) && i % 2 === 1}
          class:bg-surface-strong={isActiveLink(link.href)}
          style="box-shadow: {isActiveLink(link.href)
            ? 'inset 3px 0 0 var(--color-brand), inset 0 2px 8px rgba(0,0,0,0.14)'
            : 'inset 3px 0 0 transparent, inset 0 2px 8px transparent'}"
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
    class="flex min-h-0 max-w-[1200px] flex-col overflow-y-auto p-6"
    style="view-transition-name: admin-content"
  >
    {@render children()}
  </section>
</div>
