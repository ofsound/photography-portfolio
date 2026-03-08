<script lang="ts">
  import { getContext } from 'svelte';

  import { sanitizeSveditHref } from '$lib/svedit/page-document';

  const svedit = getContext('svedit') as {
    editable: boolean;
    session: { get: (path: Array<string | number> | string) => unknown };
  };

  const { path, content } = $props<{
    path: Array<string | number>;
    content: string;
  }>();

  const href = $derived.by(() => {
    const annotationNodeId = svedit.session.get(path);
    if (typeof annotationNodeId !== 'string') return '#';

    const annotationNode = svedit.session.get(annotationNodeId) as
      | { href?: string }
      | undefined;

    return sanitizeSveditHref(annotationNode?.href);
  });
</script>

{#if svedit.editable}
  <span class="text-sky-600 underline decoration-sky-400">{content}</span>
{:else}
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
  <a class="text-sky-600 underline decoration-sky-400" {href}>{content}</a>
{/if}
