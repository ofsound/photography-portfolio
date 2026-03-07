<script lang="ts">
  type MessageType = 'success' | 'error' | 'neutral';

  const {
    type = 'neutral',
    class: className = '',
    children,
  } = $props<{
    type?: MessageType;
    class?: string;
    children: import('svelte').Snippet;
  }>();

  const typeClasses = $derived.by(() => {
    switch (type) {
      case 'success':
        return 'border-success/40 bg-success-soft text-success';
      case 'error':
        return 'border-danger/40 bg-danger-soft text-danger';
      default:
        return 'border-border bg-surface text-text';
    }
  });
</script>

<p class={`w-fit rounded border px-3 py-2 text-sm ${typeClasses} ${className}`}>
  {@render children()}
</p>
