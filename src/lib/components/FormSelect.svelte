<script lang="ts">
  import { getContext, type Snippet } from 'svelte';

  import {
    formFieldContextKey,
    type FormFieldContextResolver,
  } from '$lib/components/form-field-context';
  import {
    formControlBaseClass,
    formControlInvalidClass,
  } from '$lib/constants/form';

  type Props = {
    id?: string;
    name?: string;
    value?: string;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    class?: string;
    disabled?: boolean;
    form?: string;
    children: Snippet;
  };

  let {
    id,
    name,
    value = $bindable(''),
    required,
    invalid,
    describedBy,
    class: className = '',
    disabled = false,
    form,
    children,
  }: Props = $props();

  const fieldContext = getContext<FormFieldContextResolver | undefined>(
    formFieldContextKey,
  );
  const contextState = $derived(fieldContext?.());
  const isRequired = $derived(required ?? contextState?.required ?? false);
  const isInvalid = $derived(invalid ?? contextState?.invalid ?? false);
  const ariaDescribedBy = $derived.by(() => {
    const ids = [describedBy, contextState?.describedBy]
      .filter(Boolean)
      .flatMap((value) => String(value).split(/\s+/g))
      .filter(Boolean);
    if (!ids.length) return undefined;
    return [...new Set(ids)].join(' ');
  });
  const fullClass = $derived(
    `${formControlBaseClass} ${isInvalid ? formControlInvalidClass : ''} ${className}`.trim(),
  );
</script>

<select
  {id}
  {name}
  bind:value
  required={isRequired}
  class={fullClass}
  {disabled}
  {form}
  aria-invalid={isInvalid ? 'true' : undefined}
  aria-describedby={ariaDescribedBy}
>
  {@render children()}
</select>
