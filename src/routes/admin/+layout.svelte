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
  class="min-h-screen md:grid md:h-[calc(100vh-var(--site-header-height))] md:grid-cols-[220px_1fr]"
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
    class="hidden h-full flex-col border-r border-border md:flex"
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

    <!-- ══════════════════════════════════════════════════
         Variation 1 · ARCHITECTURAL VORTEX
         Interfering gradients masked into a moire vortex
         ══════════════════════════════════════════════════ -->
    <div class="relative overflow-hidden border-t border-border bg-surface-muted">
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.12]" 
        style="background: repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 3px); mask-image: radial-gradient(ellipse at 80% 50%, black 10%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at 80% 50%, black 10%, transparent 70%);"
      ></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.08]" 
        style="background: repeating-linear-gradient(-40deg, transparent, transparent 2.5px, currentColor 2.5px, currentColor 3.5px); mask-image: radial-gradient(ellipse at 80% 50%, black 10%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at 80% 50%, black 10%, transparent 70%);"
      ></div>
      <svg class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 200 80">
        <line x1="80%" y1="0" x2="80%" y2="80" stroke="currentColor" stroke-width="0.3" opacity="0.2" stroke-dasharray="2 2" />
        <circle cx="80%" cy="40" r="30" stroke="currentColor" stroke-width="0.3" fill="none" opacity="0.1" />
        <circle cx="80%" cy="40" r="15" stroke="var(--color-brand)" stroke-width="0.4" fill="none" opacity="0.2" />
        <line x1="70%" y1="40" x2="90%" y2="40" stroke="currentColor" stroke-width="0.3" opacity="0.2" />
        <circle cx="80%" cy="40" r="1.5" fill="var(--color-brand)" opacity="0.4" />
      </svg>
      <p class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase" style="color: var(--color-text)">
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 2 · KINEMATIC APERTURE DIAGRAM
         Exploded technical view of a mechanical iris
         ══════════════════════════════════════════════════ -->
    <div class="relative overflow-hidden border-t border-border bg-surface-muted">
      <div class="pointer-events-none absolute inset-0 opacity-[0.05]" style="background-image: linear-gradient(color-mix(in srgb, var(--color-text) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-text) 5%, transparent) 1px, transparent 1px); background-size: 10px 10px; mask-image: radial-gradient(ellipse at 20% 50%, black 20%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at 20% 50%, black 20%, transparent 70%);"></div>
      <svg class="pointer-events-none absolute inset-0 h-full w-full overflow-hidden" aria-hidden="true" viewBox="0 0 200 80" preserveAspectRatio="xMidYMid slice">
        <g stroke="currentColor" stroke-width="0.2" opacity="0.15">
          <line x1="0" y1="40" x2="200" y2="40" />
          <line x1="160" y1="0" x2="160" y2="80" />
          <circle cx="160" cy="40" r="30" />
          <circle cx="160" cy="40" r="28" stroke-dasharray="2 1" />
        </g>
        <g transform="translate(160 40) scale(0.65)" stroke="currentColor" stroke-width="0.5" opacity="0.25" fill="color-mix(in srgb, currentColor 2%, transparent)">
          <path d="M0 8 L18 20 L0 16 Z" />
          <path d="M19.5 22 L5 34 L12 25 Z" />
          <path d="M-6 26 L-24 14 L-6 18 Z" />
          <polygon points="0,16 12,25 -6,26" stroke="var(--color-brand)" stroke-dasharray="1 1.5" fill="color-mix(in srgb, var(--color-brand) 5%, transparent)" opacity="0.7" />
        </g>
        <text x="12" y="72" font-family="monospace" font-size="4" fill="currentColor" stroke="none" opacity="0.25">FIG 2.4 / KINEMATICS</text>
        <line x1="10" y1="68" x2="15" y2="68" stroke="currentColor" stroke-width="0.3" opacity="0.3" />
      </svg>
      <p class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase" style="color: var(--color-text)">
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 3 · OPTICAL INTERFERENCE MESH
         Dense technical matrix mapping with data curves
         ══════════════════════════════════════════════════ -->
    <div class="relative overflow-hidden border-t border-border bg-surface-muted">
      <div 
        class="pointer-events-none absolute inset-0" 
        style="background-image: linear-gradient(color-mix(in srgb, var(--color-text) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-text) 8%, transparent) 1px, transparent 1px); background-size: 8px 8px; mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);"
      ></div>
      <svg class="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 80">
        <path d="M 0,60 Q 25,20 50,50 T 100,40" fill="none" stroke="var(--color-danger)" stroke-width="0.3" opacity="0.3" stroke-dasharray="1 1" />
        <path d="M 0,30 Q 30,60 60,35 T 100,60" fill="none" stroke="var(--color-brand)" stroke-width="0.4" opacity="0.25" />
        <path d="M 0,30 Q 30,60 60,35 T 100,60 L 100,80 L 0,80 Z" fill="color-mix(in srgb, var(--color-brand) 3%, transparent)" stroke="none" opacity="0.8" />
        <circle cx="25" cy="45" r="1" fill="currentColor" opacity="0.2" />
        <circle cx="75" cy="45" r="1" fill="currentColor" opacity="0.2" />
      </svg>
      <p class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase" style="color: var(--color-text)">
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 4 · POLAR COORDINATE LATTICE
         Architectural polar grid radiating from offset origin
         ══════════════════════════════════════════════════ -->
    <div class="relative overflow-hidden border-t border-border bg-surface-muted">
      <div class="pointer-events-none absolute inset-0 mix-blend-screen opacity-50" style="background: radial-gradient(circle at 100% 20%, color-mix(in srgb, var(--color-info) 10%, transparent), transparent 75%)"></div>
      <svg class="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 200 80">
        <g stroke="currentColor" fill="none" stroke-width="0.3" opacity="0.15">
          {#each Array(8) as _, i}
            <circle cx="200" cy="16" r={i * 25 + 10} />
          {/each}
          {#each Array(18) as _, i}
            {@const angle = (i * 10 + 90) * (Math.PI / 180)}
            <line x1="200" y1="16" x2={200 + 200 * Math.cos(angle)} y2={16 + 200 * Math.sin(angle)} stroke-dasharray="2 3" opacity="0.5" />
          {/each}
        </g>
        <g fill="var(--color-brand)" opacity="0.4">
          <circle cx="150" cy="30" r="1" />
          <circle cx="100" cy="50" r="1" />
          <circle cx="180" cy="60" r="1" />
        </g>
      </svg>
      <p class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase" style="color: var(--color-text)">
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 5 · CHRONOLOGICAL WAVEFORM
         Spectral analysis with drifting gradient fluid wash
         ══════════════════════════════════════════════════ -->
    <div class="relative overflow-hidden border-t border-border bg-surface-muted">
      <div 
        class="pointer-events-none absolute inset-0 cms-gradient-drift opacity-60"
        style="background: radial-gradient(ellipse 60% 80% at 90% 10%, color-mix(in oklch, var(--color-brand) 6%, transparent), transparent 70%), radial-gradient(ellipse 70% 50% at 70% 90%, color-mix(in oklch, var(--color-info) 4%, transparent), transparent 60%);"
      ></div>
      <svg class="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 200 80">
        <g fill="currentColor" opacity="0.05">
          {#each Array(40) as _, i}
            {@const r = Math.abs(Math.sin(i * 123.456)) * 4}
            {@const h = 5 + Math.sin(i * 0.4) * 5 + Math.cos(i * 1.3) * 3 + r}
            <rect x={i * 5 + 2} y={40 - h} width="2" height={h * 2} />
          {/each}
        </g>
        <line x1="0" y1="40" x2="200" y2="40" stroke="currentColor" stroke-width="0.3" opacity="0.15" />
        <path d="M 0,40 Q 10,20 20,40 T 40,40 T 60,40 T 80,40 T 100,40 T 120,40 T 140,40 T 160,40 T 180,40 T 200,40" stroke="var(--color-brand)" fill="none" stroke-width="0.4" opacity="0.4" stroke-dasharray="1 1.5" />
        <path d="M 0,40 Q 25,60 50,40 T 100,40 T 150,40 T 200,40" stroke="currentColor" fill="none" stroke-width="0.2" opacity="0.25" />
      </svg>
      <p class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase" style="color: var(--color-text)">
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 6 · GRID SCOPE
         Fine engineering grid, scan-line, corner crosshairs
         ══════════════════════════════════════════════════ -->
    <div
      class="relative overflow-hidden border-t border-border bg-surface-muted"
    >
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="cms-grid-fine"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 14 0 L 0 0 0 14"
              fill="none"
              stroke="currentColor"
              stroke-width="0.25"
              opacity="0.12"
            />
          </pattern>
          <pattern
            id="cms-grid-coarse"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 56 0 L 0 0 0 56"
              fill="none"
              stroke="currentColor"
              stroke-width="0.4"
              opacity="0.08"
            />
          </pattern>
          <radialGradient id="cms-grid-mask" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="white" stop-opacity="1" />
            <stop offset="100%" stop-color="white" stop-opacity="0.3" />
          </radialGradient>
          <mask id="cms-grid-fade">
            <rect width="100%" height="100%" fill="url(#cms-grid-mask)" />
          </mask>
        </defs>
        <g mask="url(#cms-grid-fade)">
          <rect width="100%" height="100%" fill="url(#cms-grid-fine)" />
          <rect width="100%" height="100%" fill="url(#cms-grid-coarse)" />
        </g>
        <!-- Horizontal scan line -->
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke="currentColor"
          stroke-width="0.5"
          opacity="0.1"
          stroke-dasharray="8 5"
        />
        <!-- Vertical center whisker -->
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.05"
        />
      </svg>
      <!-- Corner crosshairs -->
      <svg
        class="pointer-events-none absolute top-1.5 left-1.5 h-3 w-3"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="12"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <line
          x1="0"
          y1="6"
          x2="12"
          y2="6"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <circle
          cx="6"
          cy="6"
          r="2"
          fill="none"
          stroke="currentColor"
          stroke-width="0.4"
          opacity="0.15"
        />
      </svg>
      <svg
        class="pointer-events-none absolute top-1.5 right-1.5 h-3 w-3"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="12"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <line
          x1="0"
          y1="6"
          x2="12"
          y2="6"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <circle
          cx="6"
          cy="6"
          r="2"
          fill="none"
          stroke="currentColor"
          stroke-width="0.4"
          opacity="0.15"
        />
      </svg>
      <svg
        class="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="12"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <line
          x1="0"
          y1="6"
          x2="12"
          y2="6"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <circle
          cx="6"
          cy="6"
          r="2"
          fill="none"
          stroke="currentColor"
          stroke-width="0.4"
          opacity="0.15"
        />
      </svg>
      <svg
        class="pointer-events-none absolute right-1.5 bottom-1.5 h-3 w-3"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="12"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <line
          x1="0"
          y1="6"
          x2="12"
          y2="6"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.25"
        />
        <circle
          cx="6"
          cy="6"
          r="2"
          fill="none"
          stroke="currentColor"
          stroke-width="0.4"
          opacity="0.15"
        />
      </svg>
      <p
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text)"
      >
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 7 · APERTURE RING
         Camera iris with focus-ring ticks, radial wash
         ══════════════════════════════════════════════════ -->
    <div
      class="relative overflow-hidden border-t border-border bg-surface-muted"
    >
      <!-- Radial gradient wash -->
      <div
        class="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style="background: radial-gradient(ellipse 90% 140% at 82% 50%, color-mix(in oklch, var(--color-brand) 8%, transparent), transparent 70%)"
      ></div>
      <!-- Aperture iris -->
      <svg
        class="cms-aperture-ring pointer-events-none absolute top-1/2 -right-3 h-18 w-18 -translate-y-1/2"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <!-- Outer measurement ring -->
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="currentColor"
          stroke-width="0.4"
          opacity="0.15"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.1"
        />
        <!-- Focus ring ticks -->
        {#each Array(36) as _, i (i)}
          {@const angle = i * 10 * (Math.PI / 180)}
          {@const inner = i % 3 === 0 ? 43 : 44.5}
          {@const outer = 46}
          <line
            x1={50 + inner * Math.cos(angle)}
            y1={50 + inner * Math.sin(angle)}
            x2={50 + outer * Math.cos(angle)}
            y2={50 + outer * Math.sin(angle)}
            stroke="currentColor"
            stroke-width={i % 9 === 0 ? '0.6' : i % 3 === 0 ? '0.4' : '0.2'}
            opacity={i % 9 === 0 ? '0.2' : '0.1'}
          />
        {/each}
        <!-- 6-blade iris -->
        <path
          d="M50 10 L65 27.5 L50 24 Z"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.22"
          fill="currentColor"
          fill-opacity="0.02"
        />
        <path
          d="M84.6 30 L74 50 L67.5 37.5 Z"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.22"
          fill="currentColor"
          fill-opacity="0.02"
        />
        <path
          d="M84.6 70 L65 72.5 L74 50 Z"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.22"
          fill="currentColor"
          fill-opacity="0.02"
        />
        <path
          d="M50 90 L35 72.5 L50 76 Z"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.22"
          fill="currentColor"
          fill-opacity="0.02"
        />
        <path
          d="M15.4 70 L26 50 L32.5 62.5 Z"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.22"
          fill="currentColor"
          fill-opacity="0.02"
        />
        <path
          d="M15.4 30 L35 27.5 L26 50 Z"
          stroke="currentColor"
          stroke-width="0.6"
          opacity="0.22"
          fill="currentColor"
          fill-opacity="0.02"
        />
        <!-- Inner aperture polygon -->
        <polygon
          points="50,24 67.5,37.5 74,50 65,72.5 50,76 32.5,62.5 26,50 35,27.5"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.18"
          fill="none"
        />
        <!-- Center -->
        <circle cx="50" cy="50" r="2" fill="currentColor" opacity="0.1" />
        <circle
          cx="50"
          cy="50"
          r="6"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.08"
          fill="none"
        />
      </svg>
      <!-- Thin horizontal datum line -->
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke="currentColor"
          stroke-width="0.3"
          opacity="0.06"
        />
      </svg>
      <p
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text)"
      >
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 8 · CIRCUIT TRACE
         PCB traces, via holes, terminal dots, animated dash
         ══════════════════════════════════════════════════ -->
    <div
      class="relative overflow-hidden border-t border-border bg-surface-muted"
    >
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 220 72"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cms-trace-grad" x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stop-color="var(--color-brand)"
              stop-opacity="0"
            />
            <stop
              offset="20%"
              stop-color="var(--color-brand)"
              stop-opacity="0.14"
            />
            <stop
              offset="80%"
              stop-color="var(--color-brand)"
              stop-opacity="0.14"
            />
            <stop
              offset="100%"
              stop-color="var(--color-brand)"
              stop-opacity="0"
            />
          </linearGradient>
        </defs>
        <!-- Primary traces -->
        <polyline
          points="0,16 35,16 43,8 85,8 93,16 155,16"
          fill="none"
          stroke="url(#cms-trace-grad)"
          stroke-width="0.7"
          stroke-linejoin="round"
        />
        <polyline
          points="25,56 65,56 73,48 125,48 133,56 220,56"
          fill="none"
          stroke="url(#cms-trace-grad)"
          stroke-width="0.7"
          stroke-linejoin="round"
        />
        <!-- Secondary traces -->
        <polyline
          points="0,36 18,36 26,28 55,28"
          fill="none"
          stroke="url(#cms-trace-grad)"
          stroke-width="0.5"
        />
        <polyline
          points="165,28 180,28 188,36 220,36"
          fill="none"
          stroke="url(#cms-trace-grad)"
          stroke-width="0.5"
        />
        <polyline
          points="0,48 12,48 20,40 38,40"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.35"
          opacity="0.08"
        />
        <polyline
          points="185,40 200,40 208,48 220,48"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.35"
          opacity="0.08"
        />
        <!-- Animated dashed trace -->
        <polyline
          class="cms-circuit-dash"
          points="0,64 45,64 53,56 105,56 113,64 175,64 183,56 220,56"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.5"
          opacity="0.18"
          stroke-dasharray="8 6"
        />
        <!-- Via holes -->
        <circle
          cx="85"
          cy="8"
          r="3"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.4"
          opacity="0.12"
        />
        <circle cx="85" cy="8" r="1" fill="var(--color-brand)" opacity="0.1" />
        <circle
          cx="125"
          cy="48"
          r="3"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.4"
          opacity="0.12"
        />
        <circle
          cx="125"
          cy="48"
          r="1"
          fill="var(--color-brand)"
          opacity="0.1"
        />
        <circle
          cx="110"
          cy="32"
          r="2.5"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.35"
          opacity="0.08"
        />
        <circle
          cx="110"
          cy="32"
          r="0.8"
          fill="var(--color-brand)"
          opacity="0.06"
        />
        <!-- Terminal dots -->
        <circle
          cx="43"
          cy="8"
          r="1.5"
          fill="var(--color-brand)"
          opacity="0.18"
        />
        <circle
          cx="93"
          cy="16"
          r="1.5"
          fill="var(--color-brand)"
          opacity="0.18"
        />
        <circle
          cx="73"
          cy="48"
          r="1.5"
          fill="var(--color-brand)"
          opacity="0.18"
        />
        <circle
          cx="133"
          cy="56"
          r="1.5"
          fill="var(--color-brand)"
          opacity="0.18"
        />
        <circle
          cx="26"
          cy="28"
          r="1.2"
          fill="var(--color-brand)"
          opacity="0.12"
        />
        <circle
          cx="188"
          cy="36"
          r="1.2"
          fill="var(--color-brand)"
          opacity="0.12"
        />
      </svg>
      <p
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text)"
      >
        CMS
      </p>
    </div>

    <!-- ══════════════════════════════════════════════════
         Variation 9 · PULSE SIGNAL
         Oscilloscope waveform, dot-matrix bg, glow filter
         ══════════════════════════════════════════════════ -->
    <div
      class="relative overflow-hidden border-t border-border bg-surface-muted"
    >
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 220 72"
        aria-hidden="true"
      >
        <defs>
          <!-- Dot-matrix pattern -->
          <pattern
            id="cms-dots"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="5" cy="5" r="0.35" fill="currentColor" opacity="0.07" />
          </pattern>
          <!-- Glow filter -->
          <filter id="cms-glow" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="1.5"
              result="blur"
            />
            <feColorMatrix in="blur" type="saturate" values="2" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <!-- Background dot matrix -->
        <rect width="100%" height="100%" fill="url(#cms-dots)" />
        <!-- Baseline -->
        <line
          x1="0"
          y1="36"
          x2="220"
          y2="36"
          stroke="currentColor"
          stroke-width="0.25"
          opacity="0.06"
        />
        <!-- Scale marks -->
        {#each [12, 24, 36, 48, 60] as y (y)}
          <line
            x1="0"
            y1={y}
            x2="5"
            y2={y}
            stroke="currentColor"
            stroke-width="0.35"
            opacity="0.1"
          />
          <line
            x1="215"
            y1={y}
            x2="220"
            y2={y}
            stroke="currentColor"
            stroke-width="0.35"
            opacity="0.1"
          />
        {/each}
        <!-- Signal waveform (with glow) -->
        <path
          class="cms-signal-line"
          d="M 0,36 L 28,36 L 32,36 L 36,14 L 40,58 L 44,20 L 48,46 L 52,36 L 88,36 L 92,36 L 96,10 L 100,62 L 104,18 L 108,50 L 112,36 L 158,36 L 162,36 L 166,18 L 170,54 L 174,24 L 178,44 L 182,36 L 220,36"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="0.9"
          opacity="0.35"
          stroke-linejoin="round"
          stroke-linecap="round"
          filter="url(#cms-glow)"
        />
        <!-- Faint echo / shadow signal -->
        <path
          d="M 0,36 L 28,36 L 32,36 L 36,14 L 40,58 L 44,20 L 48,46 L 52,36 L 88,36 L 92,36 L 96,10 L 100,62 L 104,18 L 108,50 L 112,36 L 158,36 L 162,36 L 166,18 L 170,54 L 174,24 L 178,44 L 182,36 L 220,36"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="3"
          opacity="0.03"
          stroke-linejoin="round"
        />
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
      class="relative overflow-hidden border-t border-border bg-surface-muted"
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
        class="relative px-4 py-5 text-3xl font-bold tracking-[0.3em] uppercase"
        style="color: var(--color-text)"
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
    <div class="mt-auto flex items-center justify-center p-4">
      <AdminThemeToggle />
    </div>
  </aside>

  <section
    class="flex min-h-screen flex-col p-4 pt-[calc(var(--size-mobile-header-offset)+1rem)] md:min-h-0 md:max-w-[1200px] md:overflow-y-auto md:p-6"
    data-admin-mobile-menu-root
    style="view-transition-name: admin-content"
  >
    {@render children()}
  </section>
</div>

<style>
  /* ── V5 · Gradient drift ── */
  .cms-gradient-drift {
    animation: cms-drift 15s ease-in-out infinite alternate;
  }
  @keyframes cms-drift {
    0% { filter: hue-rotate(0deg) scale(1); }
    100% { filter: hue-rotate(10deg) scale(1.05); }
  }

  
  /* ── V7 · Aperture breathing ── */
  .cms-aperture-ring {
    animation: cms-breathe 6s ease-in-out infinite;
  }

  @keyframes cms-breathe {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.05) rotate(3deg);
      opacity: 0.9;
    }
  }

  /* ── V8 · Circuit trace march ── */
  .cms-circuit-dash {
    animation: cms-dash 3s linear infinite;
  }

  @keyframes cms-dash {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -28;
    }
  }

  /* ── V9 · Signal draw ── */
  .cms-signal-line {
    stroke-dasharray: 500;
    stroke-dashoffset: 500;
    animation: cms-signal-draw 4s ease-in-out infinite;
  }

  @keyframes cms-signal-draw {
    0% {
      stroke-dashoffset: 500;
    }
    35% {
      stroke-dashoffset: 0;
    }
    65% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: -500;
    }
  }

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
    .cms-gradient-drift,
    .cms-aperture-ring,
    .cms-reticle-ring,
    .cms-circuit-dash {
      animation: none;
    }

    .cms-aperture-ring {
      opacity: 0.7;
    }

    .cms-signal-line {
      animation: none;
      stroke-dasharray: none;
      stroke-dashoffset: 0;
    }
  }
</style>
