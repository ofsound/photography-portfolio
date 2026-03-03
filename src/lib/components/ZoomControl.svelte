<script lang="ts">
  let {
    value,
    min = 1,
    max = 20,
    label = 'Zoom',
    onUpdate
  } = $props<{
    value: number;
    min?: number;
    max?: number;
    label?: string;
    onUpdate: (value: number) => void;
  }>();

  const handleInput = (e: Event & { currentTarget: HTMLInputElement }) => {
    const v = Number(e.currentTarget.value);
    if (!Number.isNaN(v)) {
      onUpdate(v);
    }
  };

  const handleChange = (e: Event & { currentTarget: HTMLInputElement }) => {
    const el = e.currentTarget;
    let v = Number(el.value);
    if (Number.isNaN(v) || v < min) v = min;
    if (v > max) v = max;
    el.value = String(v);
    onUpdate(v);
  };
</script>

<div
  class="flex items-center gap-2 text-xs uppercase tracking-[var(--tracking-heading)]"
  role="group"
  aria-label={label}
>
  <span>{label}</span>
  <div class="flex items-center gap-1">
    <input
      type="number"
      {min}
      {max}
      {value}
      class="h-6 w-8 rounded border border-border-strong bg-transparent py-0.5 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      aria-label={label}
      oninput={handleInput}
      onchange={handleChange}
    />
    <div class="flex flex-col">
      <button
        type="button"
        class="flex h-[14px] w-6 shrink-0 items-center justify-center rounded-sm hover:bg-border/50 disabled:opacity-40"
        aria-label="Increase {label.toLowerCase()}"
        disabled={value >= max}
        onclick={() => onUpdate(value + 1)}
      >
        <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        class="flex h-[14px] w-6 shrink-0 items-center justify-center rounded-sm hover:bg-border/50 disabled:opacity-40"
        aria-label="Decrease {label.toLowerCase()}"
        disabled={value <= min}
        onclick={() => onUpdate(value - 1)}
      >
        <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  </div>
</div>
