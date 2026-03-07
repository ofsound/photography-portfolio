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
    <div
      class="relative overflow-hidden border-b border-border bg-surface-muted"
    >
      <!-- Diagonal stripes -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,var(--color-admin-diagonal)_6px,var(--color-admin-diagonal)_8px)]"
      ></div>
      <p
        class="relative p-4 text-2xl font-bold tracking-[0.35em] uppercase [text-shadow:0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.25)]"
      >
        CMS
      </p>
    </div>
    <nav class="text-md flex flex-col border-y border-border font-medium">
      {#each links as link, i (link.href)}
        <div
          class="relative flex items-center justify-between border-t border-border first:border-t-0"
          class:bg-surface-subtle={!isActiveLink(link.href) && i % 2 === 1}
          class:bg-surface-strong={isActiveLink(link.href)}
          class:shadow-[inset_3px_0_0_var(--color-brand),inset_0_2px_8px_rgba(0,0,0,0.14)]={isActiveLink(
            link.href,
          )}
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
