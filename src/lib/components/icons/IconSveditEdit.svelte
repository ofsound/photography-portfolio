<script lang="ts">
  const {
    active = false,
    class: className = 'size-4.5',
  }: {
    active?: boolean;
    class?: string;
  } = $props();
</script>

<svg
  class="{className} overflow-visible"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-linecap="round"
  stroke-linejoin="round"
  stroke-width="2"
  aria-hidden="true"
>
  {#if active}
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="3" />
  {:else}
    <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
    <text
      x="13.5"
      y="20.5"
      font-size="9"
      font-family="sans-serif"
      font-weight="bold"
      fill="currentColor"
      stroke="none"
    >
      SV
    </text>
  {/if}
</svg>
