<script lang="ts" module>
  let emitterCounter = 0;

  export const nextEmitterSource = () => `toast-emitter:${++emitterCounter}`;
</script>

<script lang="ts">
  import {
    pushAdminToast,
    type ToastLinks,
    type ToastType,
  } from '$lib/stores/admin-toast.svelte';

  interface Props {
    message?: string | null;
    type?: ToastType;
    source?: string;
    clearQueryMessage?: boolean;
    links?: ToastLinks;
  }

  const {
    message,
    type = 'neutral',
    source,
    clearQueryMessage = false,
    links,
  }: Props = $props();

  const fallbackSource = nextEmitterSource();
  const emitterSource = $derived(source ?? fallbackSource);
  const normalizedMessage = $derived((message ?? '').trim());

  let lastSeenSignature: string | null = null;

  $effect(() => {
    if (!normalizedMessage) {
      lastSeenSignature = null;
      return;
    }

    const signature = `${type}:${normalizedMessage}`;
    if (lastSeenSignature === signature) return;
    lastSeenSignature = signature;

    pushAdminToast({
      message: normalizedMessage,
      type,
      source: emitterSource,
      links,
    });

    if (clearQueryMessage && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;

      if (url.searchParams.has('message')) {
        url.searchParams.delete('message');
        changed = true;
      }
      if (url.searchParams.has('success')) {
        url.searchParams.delete('success');
        changed = true;
      }
      if (changed) {
        const search = url.searchParams.toString();
        const nextUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
        window.history.replaceState(window.history.state, '', nextUrl);
      }
    }
  });
</script>
