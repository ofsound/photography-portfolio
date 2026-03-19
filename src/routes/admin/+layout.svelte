<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import { FileText } from '@lucide/svelte';

  import AdminThemeToggle from '$lib/components/admin/AdminThemeToggle.svelte';
  import AdminToastViewport from '$lib/components/admin/AdminToastViewport.svelte';
  import MobileDropdownMenu from '$lib/components/navigation/MobileDropdownMenu.svelte';

  import type { AdminRouteData } from '$lib/types/route-data';
  import { computeAdminPublicPath } from '$lib/utils/admin-public-paths';

  import type { LayoutData } from './$types';

  const { data, children } = $props<{
    data: LayoutData;
    children: import('svelte').Snippet;
  }>();
  let adminMobileMenuOpen = $state(false);

  const adminPublicPath = $derived.by(() =>
    computeAdminPublicPath(
      page.url.pathname,
      (page.data as AdminRouteData | null) ?? null,
    ),
  );

  const adminMobileFlushToggleChrome = $derived(
    (data as AdminRouteData).adminMobileFlushToggleChrome === true,
  );

  const links = $derived.by(() => {
    const list = [
      { href: '/admin/library', label: 'Library' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/tags', label: 'Tags' },
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/settings', label: 'Settings' },
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
    if (href === '/admin/settings') {
      return (
        page.url.pathname === '/admin/settings' ||
        page.url.pathname.startsWith('/admin/settings/')
      );
    }
    if (href === '/admin/pages') {
      return (
        page.url.pathname === '/admin/pages' ||
        page.url.pathname.startsWith('/admin/pages/')
      );
    }
    return page.url.pathname === href;
  };
</script>

<div
  class="h-full min-h-0 overflow-hidden md:grid md:grid-cols-[220px_1fr]"
  style="--font-sans: var(--font-sans-admin); font-family: var(--font-sans)"
>
  <header
    class="fixed inset-x-0 top-0 z-[60] border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)] md:hidden"
  >
    <div
      class="flex h-[var(--size-mobile-header)] items-center justify-between gap-3"
    >
      <p class="text-2xl font-bold tracking-[0.28em] uppercase">CMS</p>
      <div class="flex items-center gap-2">
        {#if adminPublicPath}
          <a
            href={resolve(adminPublicPath as `/${string}`)}
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="View public page"
            title="View public page"
          >
            <FileText class="size-4.5" />
          </a>
        {/if}

        <MobileDropdownMenu
          id="admin-mobile-nav"
          label="Toggle admin navigation"
          inertSelector="[data-admin-mobile-menu-root]"
          bind:open={adminMobileMenuOpen}
        >
          <nav
            aria-label="Admin mobile navigation"
            class="text-md flex flex-col border-b border-border font-medium"
          >
            {#each links as link (link.href)}
              <a
                href={resolve(link.href as `/${string}`)}
                class="border-t border-border py-4 text-xl transition-shadow duration-300 first:border-t-0"
              >
                {link.label}
              </a>
            {/each}
          </nav>
          <div class="pt-8">
            <AdminThemeToggle />
          </div>
        </MobileDropdownMenu>
      </div>
    </div>
  </header>

  <aside
    class="hidden h-full min-h-0 flex-col border-r border-border md:flex"
    style="view-transition-name: admin-sidebar"
  >
    <div class="relative overflow-hidden bg-surface-muted">
      <div
        class="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen"
        style="background: radial-gradient(circle at 0% 20%, color-mix(in srgb, var(--color-info) 10%, transparent), transparent 75%)"
      ></div>
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 200 80"
      >
        <g
          transform="translate(200, 0) scale(-1, 1)"
          stroke="currentColor"
          fill="none"
          stroke-width="0.3"
          opacity="0.15"
        >
          {#each Array(8) as _, i (i)}
            <circle cx="200" cy="16" r={i * 25 + 10} />
          {/each}
          {#each Array(18) as _, i (i)}
            {@const angle = (i * 10 + 90) * (Math.PI / 180)}
            <line
              x1="200"
              y1="16"
              x2={200 + 200 * Math.cos(angle)}
              y2={16 + 200 * Math.sin(angle)}
              stroke-dasharray="2 3"
              opacity="0.5"
            />
          {/each}
        </g>
      </svg>
      <p
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text)"
      >
        CMS
      </p>
    </div>

    <nav
      class="text-md flex flex-1 flex-col overflow-y-auto border-t border-border font-medium"
    >
      {#each links as link, i (link.href)}
        <div
          class="relative flex items-center justify-between border-t border-border transition-shadow duration-300 first:border-t-0 last:border-b"
          class:bg-surface-subtle={!isActiveLink(link.href) && i % 2 === 1}
          class:bg-surface-strong={isActiveLink(link.href)}
          style="box-shadow: {isActiveLink(link.href)
            ? 'inset 4px 0 0 var(--color-brand), inset 0 2px 6px rgba(0,0,0,0.1)'
            : 'inset 4px 0 0 transparent, inset 0 2px 8px transparent'}"
        >
          <a
            href={resolve(link.href as `/${string}`)}
            class="absolute inset-0 z-0"
            aria-label={link.label}
          ></a>
          <span class="pointer-events-none z-10 px-5 py-3">{link.label}</span>
        </div>
      {/each}
    </nav>
    <div class="mt-auto mb-4 flex items-center justify-center p-4">
      <AdminThemeToggle />
    </div>
  </aside>

  <section
    class="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-y-contain p-4 md:p-6 {adminMobileFlushToggleChrome
      ? 'pt-[var(--size-mobile-header-offset)]'
      : 'pt-[calc(var(--size-mobile-header-offset)+1rem)]'}"
    data-admin-mobile-menu-root
    style="view-transition-name: admin-content"
  >
    <div class="pointer-events-none absolute inset-x-0 top-0 z-70">
      <div class="relative w-full md:max-w-[var(--admin-content-max)]">
        <AdminToastViewport contained />
      </div>
    </div>
    <div class="w-full md:max-w-[var(--admin-content-max)]">
      {@render children()}
    </div>
  </section>
</div>
