<script lang="ts">
  let { state, size = 'md' } = $props<{
    state: 'ready' | 'pending' | 'mixed' | 'no-images' | 'converting' | 'unknown' | string;
    size?: 'sm' | 'md';
  }>();

  const sizeClass = $derived(size === 'sm' ? 'text-[var(--text-chip)]' : 'text-[var(--text-badge)]');

  const badgeClass = $derived((() => {
    // Photo-level states
    if (state === 'ready') return 'border-success/40 text-success';
    if (state === 'pending') return 'border-warning/40 text-warning';
    if (state === 'mixed') return 'border-info/40 text-info';
    if (state === 'no-images') return 'border-border/60 text-text-muted';
    if (state === 'converting') return 'border-warning/40 text-warning';
    if (state === 'unknown') return 'border-danger/40 text-danger';
    return 'border-border-strong text-text-muted';
  })());
</script>

<span class={`rounded border px-2 py-0.5 uppercase ${sizeClass} ${badgeClass}`}>{state}</span>
