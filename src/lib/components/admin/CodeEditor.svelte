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
  };

  let {
    value = $bindable(''),
    name,
    lang = 'html',
    placeholder,
    readonly = false,
    height = '300px',
  }: Props = $props();

  const readIsDarkMode = () =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  let isDarkMode = $state(readIsDarkMode());

  onMount(() => {
    const checkTheme = () => {
      isDarkMode = readIsDarkMode();
    };

    checkTheme();

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

    return () => observer.disconnect();
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
  class="relative overflow-hidden rounded border border-border-strong bg-surface text-sm"
  style:height
>
  <CodeMirror
    bind:value
    {placeholder}
    {readonly}
    drawSelection={false}
    {extensions}
    class="h-full"
    styles={{
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content, .cm-gutter': { minHeight: '100%' },
      '.cm-editor, .cm-scroller': {
        backgroundColor: 'var(--color-surface)',
      },
      '.cm-content': {
        color: 'var(--color-text)',
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
