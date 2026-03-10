<script lang="ts">
  import { setContext } from 'svelte';
  import { KeyMapper, Svedit } from 'svedit';

  import {
    createDefaultSveditPageDocument,
    parseSveditPageDocument,
    serializeSveditPageDocument,
    validateSveditPageDocument,
  } from '$lib/svedit/page-document';
  import { createPageSveditSession } from '$lib/svedit/page-session';

  type EditorCommand = {
    disabled: boolean;
    active?: boolean;
    execute: () => void;
  };

  let {
    value = $bindable(''),
    name,
    readonly = false,
    height = '32rem',
    variant = 'admin',
  } = $props<{
    value?: string;
    name?: string;
    readonly?: boolean;
    height?: string;
    variant?: 'admin' | 'inline';
  }>();

  const initial = parseSveditPageDocument(value);

  const session = $state(
    createPageSveditSession(
      initial.ok ? initial.document : createDefaultSveditPageDocument(),
    ),
  );

  if (!value) {
    value = serializeSveditPageDocument(
      initial.ok ? initial.document : createDefaultSveditPageDocument(),
    );
  }

  const keyMapper = new KeyMapper();
  setContext('key_mapper', keyMapper);

  const editable = $derived(!readonly);
  const isInline = $derived(variant === 'inline');

  let editor = $state<Svedit | null>(null);

  const commands = $derived.by(() => {
    // Nudge derivation when selection changes
    void session.selection;
    return session.commands as Record<string, EditorCommand>;
  });

  const toolbarClass = $derived.by(() =>
    isInline
      ? 'sticky top-20 z-20 flex flex-wrap gap-2 rounded-lg border border-border-strong bg-surface/95 p-2 backdrop-blur'
      : 'flex flex-wrap gap-2 rounded border border-border-strong bg-surface p-2',
  );

  const canvasShellClass = $derived.by(() =>
    isInline
      ? undefined
      : 'overflow-auto rounded border border-border-strong bg-surface p-4',
  );

  const canvasClass = $derived.by(() =>
    isInline
      ? 'text-text-main grid gap-8 sm:gap-10'
      : 'text-text-main grid gap-6',
  );

  const validationResult = $derived.by(() => {
    void session.doc;
    return validateSveditPageDocument(session.to_json());
  });
  const loadError = $derived(
    validationResult.ok ? null : validationResult.message,
  );
  const serializedDocument = $derived.by(() => {
    if (!validationResult.ok) return null;
    return serializeSveditPageDocument(validationResult.document);
  });

  $effect(() => {
    if (serializedDocument && serializedDocument !== value) {
      value = serializedDocument;
    }
  });

  const run = (commandName: string) => {
    const command = commands[commandName];
    if (!command || command.disabled) return;
    command.execute();
    editor?.focus_canvas();
  };
</script>

<svelte:window onkeydown={(event) => keyMapper.handle_keydown(event)} />

<div class={isInline ? 'grid gap-4' : 'grid gap-3'}>
  {#snippet toolbarButtons()}
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.undo?.disabled}
      onclick={() => run('undo')}>Undo</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.redo?.disabled}
      onclick={() => run('redo')}>Redo</button
    >

    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.toggle_strong?.disabled}
      onclick={() => run('toggle_strong')}>Bold</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.toggle_emphasis?.disabled}
      onclick={() => run('toggle_emphasis')}>Italic</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.set_link?.disabled}
      onclick={() => run('set_link')}>Link</button
    >

    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_hero?.disabled}
      onclick={() => run('insert_hero')}>Hero</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_section?.disabled}
      onclick={() => run('insert_section')}>Section</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_feature?.disabled}
      onclick={() => run('insert_feature')}>Feature</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_callout?.disabled}
      onclick={() => run('insert_callout')}>Callout</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_image?.disabled}
      onclick={() => run('insert_image')}>Image</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_quote?.disabled}
      onclick={() => run('insert_quote')}>Quote</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_list?.disabled}
      onclick={() => run('insert_list')}>List</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_heading?.disabled}
      onclick={() => run('insert_heading')}>Heading</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_paragraph?.disabled}
      onclick={() => run('insert_paragraph')}>Paragraph</button
    >
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs"
      disabled={commands.insert_divider?.disabled}
      onclick={() => run('insert_divider')}>Divider</button
    >
  {/snippet}

  {#if isInline}
    <div
      class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 flex justify-center px-2"
    >
      <div
        class="pointer-events-auto w-fit max-w-full overflow-x-auto rounded-lg border border-border-strong bg-surface/95 backdrop-blur"
      >
        <div class="flex w-max flex-nowrap gap-2 p-2">
          {@render toolbarButtons()}
        </div>
      </div>
    </div>
  {:else}
    <div class={toolbarClass}>
      {@render toolbarButtons()}
    </div>
  {/if}

  <div class={canvasShellClass} style:height={isInline ? undefined : height}>
    <Svedit
      bind:this={editor}
      {session}
      {editable}
      path={[session.document_id]}
      class={canvasClass}
    />
  </div>

  {#if loadError}
    <p class="text-xs text-red-600">{loadError}</p>
  {/if}

  {#if name}
    <textarea {name} bind:value class="hidden"></textarea>
  {/if}
</div>

<style>
  div {
    --editing-stroke-color: var(--color-brand);
    --editing-fill-color: var(--color-brand-contrast);
  }
</style>
