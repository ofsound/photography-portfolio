<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} · Not Found</title>
</svelte:head>

<div class="error-page">
  <!-- Gradient background -->
  <div class="gradient-bg" aria-hidden="true"></div>

  <!-- Subtle grid overlay -->
  <div class="grid-overlay" aria-hidden="true"></div>

  <!-- Content -->
  <div class="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
    <!-- Aperture line art icon -->
    <div class="aperture-wrap">
      <svg
        class="aperture-icon"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Outer ring -->
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke="currentColor"
          stroke-width="0.75"
          opacity="0.2"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          stroke="currentColor"
          stroke-width="0.5"
          opacity="0.12"
        />

        <!-- Aperture blades — 6-blade iris -->
        <path
          d="M100 20 L130 55 L100 48 Z"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.35"
          fill="currentColor"
          fill-opacity="0.03"
        />
        <path
          d="M169.3 60 L148 100 L135 75 Z"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.35"
          fill="currentColor"
          fill-opacity="0.03"
        />
        <path
          d="M169.3 140 L130 145 L148 100 Z"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.35"
          fill="currentColor"
          fill-opacity="0.03"
        />
        <path
          d="M100 180 L70 145 L100 152 Z"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.35"
          fill="currentColor"
          fill-opacity="0.03"
        />
        <path
          d="M30.7 140 L52 100 L65 125 Z"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.35"
          fill="currentColor"
          fill-opacity="0.03"
        />
        <path
          d="M30.7 60 L70 55 L52 100 Z"
          stroke="currentColor"
          stroke-width="0.8"
          opacity="0.35"
          fill="currentColor"
          fill-opacity="0.03"
        />

        <!-- Inner aperture opening -->
        <polygon
          points="100,48 135,75 148,100 130,145 100,152 65,125 52,100 70,55"
          stroke="currentColor"
          stroke-width="1"
          opacity="0.3"
          fill="none"
        />

        <!-- Center dot -->
        <circle cx="100" cy="100" r="3" fill="currentColor" opacity="0.15" />

        <!-- Crosshair marks -->
        <line
          x1="100"
          y1="8"
          x2="100"
          y2="16"
          stroke="currentColor"
          stroke-width="0.5"
          opacity="0.2"
        />
        <line
          x1="100"
          y1="184"
          x2="100"
          y2="192"
          stroke="currentColor"
          stroke-width="0.5"
          opacity="0.2"
        />
        <line
          x1="8"
          y1="100"
          x2="16"
          y2="100"
          stroke="currentColor"
          stroke-width="0.5"
          opacity="0.2"
        />
        <line
          x1="184"
          y1="100"
          x2="192"
          y2="100"
          stroke="currentColor"
          stroke-width="0.5"
          opacity="0.2"
        />

        <!-- Fine focus ring ticks -->
        {#each Array(36) as _, i (i)}
          {@const angle = i * 10 * (Math.PI / 180)}
          {@const inner = i % 3 === 0 ? 85 : 87}
          <line
            x1={100 + inner * Math.cos(angle)}
            y1={100 + inner * Math.sin(angle)}
            x2={100 + 90 * Math.cos(angle)}
            y2={100 + 90 * Math.sin(angle)}
            stroke="currentColor"
            stroke-width={i % 3 === 0 ? '0.6' : '0.3'}
            opacity="0.15"
          />
        {/each}
      </svg>
    </div>

    <!-- Status code -->
    <h1 class="error-code">{page.status}</h1>

    <!-- Message -->
    <p class="error-message">
      {#if page.status === 404}
        This frame is empty.
      {:else}
        {page.error?.message ?? 'Something went wrong.'}
      {/if}
    </p>

    <p class="error-sub">
      {#if page.status === 404}
        The page you're looking for doesn't exist or has been moved.
      {:else}
        Please try again or return home.
      {/if}
    </p>
  </div>
</div>

<style>
  .error-page {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - var(--size-header));
    min-height: calc(100dvh - var(--size-header));
    overflow: hidden;
    color: var(--color-text);
  }

  /* ── Gradient background ── */
  .gradient-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse 80% 60% at 20% 30%,
        color-mix(in oklch, var(--color-brand) 12%, transparent),
        transparent 70%
      ),
      radial-gradient(
        ellipse 60% 80% at 80% 70%,
        color-mix(in oklch, var(--color-danger) 8%, transparent),
        transparent 70%
      ),
      radial-gradient(
        ellipse 70% 50% at 50% 50%,
        color-mix(in oklch, var(--color-info) 6%, transparent),
        transparent 60%
      ),
      var(--color-bg);
    animation: gradient-drift 20s ease-in-out infinite alternate;
  }

  @keyframes gradient-drift {
    0% {
      filter: hue-rotate(0deg);
    }
    100% {
      filter: hue-rotate(15deg);
    }
  }

  /* ── Grid overlay ── */
  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(
        color-mix(in srgb, var(--color-text) 3%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-text) 3%, transparent) 1px,
        transparent 1px
      );
    background-size: 60px 60px;
    mask-image: radial-gradient(
      ellipse 50% 50% at 50% 50%,
      black 20%,
      transparent 70%
    );
  }

  /* ── Aperture SVG ── */
  .aperture-wrap {
    width: 160px;
    height: 160px;
    animation: aperture-breathe 6s ease-in-out infinite;
  }

  .aperture-icon {
    width: 100%;
    height: 100%;
    color: var(--color-text);
  }

  @keyframes aperture-breathe {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.03) rotate(3deg);
      opacity: 0.85;
    }
  }

  /* ── Typography ── */
  .error-code {
    font-family: var(--font-sans-public);
    font-size: clamp(5rem, 12vw, 9rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    background: linear-gradient(
      135deg,
      var(--color-text) 0%,
      var(--color-text-muted) 50%,
      var(--color-text-subtle) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
  }

  .error-message {
    font-family: var(--font-sans-public);
    font-size: clamp(1.15rem, 2.5vw, 1.5rem);
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--color-text);
    margin: 0;
  }

  .error-sub {
    font-size: 0.9rem;
    color: var(--color-text-subtle);
    max-width: 28ch;
    line-height: 1.6;
    margin: 0;
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .gradient-bg {
      animation: none;
    }
    .aperture-wrap {
      animation: none;
      opacity: 0.7;
    }
  }
</style>
