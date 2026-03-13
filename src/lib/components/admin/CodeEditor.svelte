<script lang="ts">
  import { onMount } from 'svelte';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { oneDark } from '@codemirror/theme-one-dark';
  import CodeMirror from 'svelte-codemirror-editor';

  type Props = {
    value?: string;
    name?: string;
    lang?: 'html' | 'css';
    placeholder?: string;
    readonly?: boolean;
    height?: string;
    lines?: number;
  };

  let {
    value = $bindable(''),
    name,
    lang = 'html',
    placeholder,
    readonly = false,
    height = '300px',
    lines,
  }: Props = $props();

  const effectiveHeight = $derived(
    lines != null ? `calc(1.5rem * ${lines})` : height,
  );

  const readIsDarkMode = () =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  const readShouldWrapLines = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 639px)').matches;

  let isDarkMode = $state(readIsDarkMode());
  let shouldWrapLines = $state(readShouldWrapLines());

  onMount(() => {
    const checkTheme = () => {
      isDarkMode = readIsDarkMode();
    };
    const checkWrapMode = () => {
      shouldWrapLines = readShouldWrapLines();
    };

    checkTheme();
    checkWrapMode();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          checkTheme();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const onMediaQueryChange = () => {
      checkWrapMode();
    };
    mediaQuery.addEventListener('change', onMediaQueryChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', onMediaQueryChange);
    };
  });

  const extensions = $derived.by(() => {
    const exts = [];
    if (lang === 'html') exts.push(html());
    if (lang === 'css') exts.push(css());
    if (isDarkMode) exts.push(oneDark);
    return exts;
  });
</script>

<div
  class="relative w-full max-w-full min-w-0 overflow-hidden rounded border border-border-strong bg-surface text-sm"
  style:height={effectiveHeight}
>
  <CodeMirror
    bind:value
    {placeholder}
    {readonly}
    lineWrapping={shouldWrapLines}
    drawSelection={false}
    {extensions}
    class="h-full w-full max-w-full min-w-0"
    styles={{
      '&': { height: '100%' },
      '.cm-editor': {
        width: '100%',
        minWidth: '0',
        maxWidth: '100%',
      },
      '.cm-scroller': {
        overflow: 'auto',
        width: '100%',
        minWidth: '0',
        maxWidth: '100%',
      },
      '.cm-content': {
        color: 'var(--color-text)',
        width: '100%',
        minWidth: '0',
        maxWidth: '100%',
        minHeight: '100%',
      },
      '.cm-editor, .cm-scroller': {
        backgroundColor: 'var(--color-surface)',
      },
      '.cm-gutter': {
        minHeight: '100%',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-muted)',
        borderRight: '1px solid var(--color-border)',
      },
      '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor:
          'color-mix(in srgb, var(--color-surface-muted) 65%, var(--color-surface))',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--color-text)',
      },
      '.cm-content ::selection': {
        backgroundColor:
          'color-mix(in srgb, var(--color-brand) 35%, var(--color-surface))',
      },
    }}
  />

  {#if name}
    <textarea {name} bind:value class="hidden"></textarea>
  {/if}
</div>
