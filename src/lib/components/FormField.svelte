<script lang="ts">
  import { setContext, type Snippet } from 'svelte';

  import {
    formFieldContextKey,
    type FormFieldContextResolver,
  } from '$lib/components/form-field-context';

  type Props = {
    label: string;
    id?: string;
    helper?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    optional?: boolean;
    labelSrOnly?: boolean;
    class?: string;
    children: Snippet;
  };

  const {
    label,
    id,
    helper,
    hint,
    error,
    required = false,
    optional = false,
    labelSrOnly = false,
    class: className,
    children,
  }: Props = $props();

  const hintText = $derived(hint ?? helper);
  const hintId = $derived(id && hintText ? `${id}-hint` : undefined);
  const errorText = $derived(error?.trim() ? error : undefined);
  const errorId = $derived(id && errorText ? `${id}-error` : undefined);
  const describedBy = $derived.by(() => {
    const ids = [hintId, errorId].filter(Boolean);
    return ids.length ? ids.join(' ') : undefined;
  });

  const resolveFieldContext: FormFieldContextResolver = () => ({
    required,
    invalid: Boolean(errorText),
    describedBy,
  });
  setContext(formFieldContextKey, resolveFieldContext);
</script>

<div class="flex flex-col gap-1 {className ?? ''}">
  {#if id}
    <label
      for={id}
      class:text-sm={!labelSrOnly}
      class:font-medium={!labelSrOnly}
      class:tracking-wider={!labelSrOnly}
      class:text-text={!labelSrOnly}
      class:sr-only={labelSrOnly}
    >
      {label}
      {#if required}
        <span aria-hidden="true" class="ml-1 text-danger">*</span>
        <span class="sr-only">required</span>
      {:else if optional}
        <span class="ml-1 text-xs font-normal text-text-muted">(Optional)</span>
      {/if}
    </label>
  {:else}
    <span
      class:text-sm={!labelSrOnly}
      class:font-medium={!labelSrOnly}
      class:tracking-wider={!labelSrOnly}
      class:text-text={!labelSrOnly}
      class:sr-only={labelSrOnly}
    >
      {label}
      {#if required}
        <span aria-hidden="true" class="ml-1 text-danger">*</span>
        <span class="sr-only">required</span>
      {:else if optional}
        <span class="ml-1 text-xs font-normal text-text-muted">(Optional)</span>
      {/if}
    </span>
  {/if}
  {@render children()}
  {#if hintText}
    <p id={hintId} class="text-xs text-text-muted">{hintText}</p>
  {/if}
  {#if errorText}
    <p id={errorId} class="text-xs text-danger">{errorText}</p>
  {/if}
</div>
