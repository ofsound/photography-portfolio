<script lang="ts">
  import { getContext } from 'svelte';
  import { AnnotatedTextProperty, Node } from 'svedit';

  const svedit = getContext('svedit') as {
    session: { get: (path: Array<string | number>) => { level?: number } };
  };

  const { path } = $props<{ path: Array<string | number> }>();

  const level = $derived.by(() => {
    const node = svedit.session.get(path);
    const rawLevel = Number(node?.level ?? 2);
    if (!Number.isInteger(rawLevel)) return 2;
    return Math.min(6, Math.max(1, rawLevel));
  });

  const tag = $derived.by(
    () => `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  );

  const headingClass = $derived.by(() => {
    if (level === 1) return 'text-4xl font-semibold tracking-tight';
    if (level === 2) return 'text-3xl font-semibold tracking-tight';
    if (level === 3) return 'text-2xl font-semibold tracking-tight';
    if (level === 4) return 'text-xl font-semibold tracking-tight';
    if (level === 5) return 'text-lg font-semibold tracking-tight';
    return 'text-base font-semibold tracking-tight';
  });
</script>

<Node {path} class="text-text-main">
  <AnnotatedTextProperty
    {tag}
    path={[...path, 'content']}
    class={headingClass}
    placeholder="Heading"
  />
</Node>
