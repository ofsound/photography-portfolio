<script lang="ts">
  let { state, size = 'md' } = $props<{
    state: 'ready' | 'pending' | 'mixed' | 'no-images' | 'converting' | 'unknown' | string;
    size?: 'sm' | 'md';
  }>();

  const sizeClass = $derived(size === 'sm' ? 'text-[10px]' : 'text-[11px]');

  const badgeClass = $derived((() => {
    // Photo-level states
    if (state === 'ready') return 'border-emerald-500/40 text-emerald-700';
    if (state === 'pending') return 'border-amber-500/40 text-amber-700';
    if (state === 'mixed') return 'border-sky-500/40 text-sky-700';
    if (state === 'no-images') return 'border-slate-400/40 text-slate-600';
    if (state === 'converting') return 'border-amber-500/40 text-amber-700';
    if (state === 'unknown') return 'border-rose-500/40 text-rose-700';
    return 'border-black/20 text-ink/70';
  })());
</script>

<span class={`rounded border px-2 py-0.5 uppercase ${sizeClass} ${badgeClass}`}>{state}</span>
