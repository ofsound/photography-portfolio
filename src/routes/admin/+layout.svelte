<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import AdminThemeToggle from '$lib/components/admin/AdminThemeToggle.svelte';
  import MobileDropdownMenu from '$lib/components/navigation/MobileDropdownMenu.svelte';

  const { data, children } = $props();
  let adminMobileMenuOpen = $state(false);

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
  class="min-h-screen md:grid md:h-[calc(100vh-var(--site-header-height))] md:min-h-0 md:grid-cols-[220px_1fr]"
  style="--font-sans: var(--font-sans-admin); font-family: var(--font-sans)"
>
  <header
    class="chrome-panel fixed inset-x-0 top-0 z-[60] border-b border-border px-4 pt-[env(safe-area-inset-top)] md:hidden"
  >
    <div
      class="flex h-[var(--size-mobile-header)] items-center justify-between gap-3"
    >
      <p class="text-base font-bold tracking-[0.28em] uppercase">CMS</p>
      <MobileDropdownMenu
        id="admin-mobile-nav"
        label="Toggle admin navigation"
        inertSelector="[data-admin-mobile-menu-root]"
        bind:open={adminMobileMenuOpen}
      >
        <nav
          aria-label="Admin mobile navigation"
          class="text-md flex flex-col border-y border-border font-medium"
        >
          {#each links as link, i (link.href)}
            <a
              href={resolve(link.href as `/${string}`)}
              class="border-t border-border px-4 py-3 transition-shadow duration-300 first:border-t-0"
              class:bg-surface-subtle={!isActiveLink(link.href) && i % 2 === 1}
              class:bg-surface-strong={isActiveLink(link.href)}
              style="box-shadow: {isActiveLink(link.href)
                ? 'inset 3px 0 0 var(--color-brand), inset 0 2px 8px rgba(0,0,0,0.14)'
                : 'inset 3px 0 0 transparent, inset 0 2px 8px transparent'}"
            >
              {link.label}
            </a>
          {/each}
        </nav>
        <div class="pt-3">
          <AdminThemeToggle />
        </div>
      </MobileDropdownMenu>
    </div>
  </header>

  <aside
    class="hidden h-full min-h-0 flex-col border-r border-border md:flex"
    style="view-transition-name: admin-sidebar"
  >
    <!-- ══════════════════════════════════════════════════
         Variation 3 · OPTICAL INTERFERENCE MESH
         Dense technical matrix mapping with data curves
         ══════════════════════════════════════════════════ -->
    <div
      class="relative hidden overflow-hidden border-t border-border bg-surface-muted"
    >
      <div
        class="pointer-events-none absolute inset-0"
        style="background-image: linear-gradient(color-mix(in srgb, var(--color-text) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-text) 8%, transparent) 1px, transparent 1px); background-size: 8px 8px; mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);"
      ></div>
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 80"
      >
        <path
          d="M 0,60 Q 25,20 50,50 T 100,40"
          fill="none"
          stroke="var(--color-danger)"
          stroke-width="0.3"
          opacity="0.3"
          stroke-dasharray="1 1"
        />
        <path
          d="M 0,30 Q 30,60 60,35 T 100,60"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.4"
          opacity="0.25"
        />
        <path
          d="M 0,30 Q 30,60 60,35 T 100,60 L 100,80 L 0,80 Z"
          fill="color-mix(in srgb, var(--color-brand) 3%, transparent)"
          stroke="none"
          opacity="0.8"
        />
        <circle cx="25" cy="45" r="1" fill="currentColor" opacity="0.2" />
        <circle cx="75" cy="45" r="1" fill="currentColor" opacity="0.2" />
      </svg>
      <p
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text)"
      >
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 4 · POLAR COORDINATE LATTICE
         Architectural polar grid radiating from offset origin
         ══════════════════════════════════════════════════ -->
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

    <!-- ══════════════════════════════════════════════════
         Variation 10 · RETICLE HUD
         Concentric reticle, edge ticks, corner brackets,
         coordinate label, slow rotation
         ══════════════════════════════════════════════════ -->
    <div
      class="relative hidden overflow-hidden border-t border-border bg-surface-muted"
    >
      <!-- Concentric reticle -->
      <svg
        class="cms-reticle-ring pointer-events-none absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <!-- Rings -->
        <circle
          cx="50"
          cy="50"
          r="48"
          stroke="currentColor"
          stroke-width="0.25"
          opacity="0.08"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.1"
        />
        <circle
          cx="50"
          cy="50"
          r="30"
          stroke="currentColor"
          stroke-width="0.25"
          opacity="0.07"
          stroke-dasharray="2.5 2.5"
        />
        <circle
          cx="50"
          cy="50"
          r="20"
          stroke="currentColor"
          stroke-width="0.2"
          opacity="0.06"
        />
        <circle
          cx="50"
          cy="50"
          r="10"
          stroke="currentColor"
          stroke-width="0.2"
          opacity="0.04"
          stroke-dasharray="1 2"
        />
        <!-- Cardinal crosshairs -->
        <line
          x1="50"
          y1="0"
          x2="50"
          y2="18"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.12"
        />
        <line
          x1="50"
          y1="82"
          x2="50"
          y2="100"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.12"
        />
        <line
          x1="0"
          y1="50"
          x2="18"
          y2="50"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.12"
        />
        <line
          x1="82"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.12"
        />
        <!-- Diagonal tick marks -->
        {#each [45, 135, 225, 315] as deg (deg)}
          {@const rad = (deg * Math.PI) / 180}
          <line
            x1={50 + 35 * Math.cos(rad)}
            y1={50 + 35 * Math.sin(rad)}
            x2={50 + 40 * Math.cos(rad)}
            y2={50 + 40 * Math.sin(rad)}
            stroke="currentColor"
            stroke-width="0.35"
            opacity="0.1"
          />
        {/each}
        <!-- 15° increment ticks on outer ring -->
        {#each Array(24) as _, i (i)}
          {@const angle = i * 15 * (Math.PI / 180)}
          {@const isCardinal = i % 6 === 0}
          {@const isMajor = i % 3 === 0}
          {#if !isCardinal}
            <line
              x1={50 + (isMajor ? 43 : 45) * Math.cos(angle)}
              y1={50 + (isMajor ? 43 : 45) * Math.sin(angle)}
              x2={50 + 48 * Math.cos(angle)}
              y2={50 + 48 * Math.sin(angle)}
              stroke="currentColor"
              stroke-width={isMajor ? '0.4' : '0.2'}
              opacity={isMajor ? '0.12' : '0.06'}
            />
          {/if}
        {/each}
        <!-- Center target -->
        <circle
          cx="50"
          cy="50"
          r="2.5"
          stroke="currentColor"
          stroke-width="0.4"
          opacity="0.12"
          fill="none"
        />
        <circle cx="50" cy="50" r="0.7" fill="currentColor" opacity="0.1" />
      </svg>
      <!-- Top edge measurement ticks -->
      <svg
        class="pointer-events-none absolute inset-x-0 top-0 h-2 w-full"
        preserveAspectRatio="none"
        viewBox="0 0 220 8"
        aria-hidden="true"
      >
        {#each Array(23) as _, i (i)}
          <line
            x1={i * 10}
            y1="0"
            x2={i * 10}
            y2={i % 5 === 0 ? 7 : i % 2 === 0 ? 4 : 2}
            stroke="currentColor"
            stroke-width={i % 5 === 0 ? '0.6' : '0.3'}
            opacity={i % 5 === 0 ? '0.15' : '0.06'}
          />
        {/each}
      </svg>
      <!-- Bottom edge measurement ticks -->
      <svg
        class="pointer-events-none absolute inset-x-0 bottom-0 h-2 w-full"
        preserveAspectRatio="none"
        viewBox="0 0 220 8"
        aria-hidden="true"
      >
        {#each Array(23) as _, i (i)}
          <line
            x1={i * 10}
            y1="8"
            x2={i * 10}
            y2={i % 5 === 0 ? 1 : i % 2 === 0 ? 4 : 6}
            stroke="currentColor"
            stroke-width={i % 5 === 0 ? '0.6' : '0.3'}
            opacity={i % 5 === 0 ? '0.15' : '0.06'}
          />
        {/each}
      </svg>
      <!-- Corner bracket marks -->
      <svg
        class="pointer-events-none absolute top-1 left-1 h-4 w-4"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 0 12 L 0 0 L 12 0"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.18"
        />
      </svg>
      <svg
        class="pointer-events-none absolute top-1 right-1 h-4 w-4"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 4 0 L 16 0 L 16 12"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.18"
        />
      </svg>
      <svg
        class="pointer-events-none absolute bottom-1 left-1 h-4 w-4"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 0 4 L 0 16 L 12 16"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.18"
        />
      </svg>
      <svg
        class="pointer-events-none absolute right-1 bottom-1 h-4 w-4"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 16 4 L 16 16 L 4 16"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.18"
        />
      </svg>
      <!-- Coordinate label -->
      <span
        class="pointer-events-none absolute right-2.5 bottom-1.5 font-mono text-[7px] tracking-[0.15em] uppercase"
        style="color: var(--color-text); opacity: 0.1"
        aria-hidden="true">SYS.CMS</span
      >
      <p
        class="relative px-5 py-5 text-center text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text) "
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
    <div class="mt-auto flex items-center justify-center p-4">
      <AdminThemeToggle />
    </div>
  </aside>

  <section
    class="flex min-h-screen flex-col p-4 pt-[calc(var(--size-mobile-header-offset)+1rem)] md:min-h-0 md:overflow-y-auto md:p-6"
    data-admin-mobile-menu-root
    style="view-transition-name: admin-content"
  >
    <div class="w-full md:max-w-[1200px]">
      {@render children()}
    </div>
  </section>
</div>

<style>
  /* ── V10 · Reticle rotation ── */
  .cms-reticle-ring {
    animation: cms-rotate 40s linear infinite;
  }

  @keyframes cms-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .cms-reticle-ring {
      animation: none;
    }
  }
</style>
