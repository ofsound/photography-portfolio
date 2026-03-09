<script lang="ts">
  import { getContext } from 'svelte';

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
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    class?: string;
    oninput?: (e: Event) => void;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    disabled?: boolean;
    readonly?: boolean;
    form?: string;
  };

  let {
    id,
    name,
    type = 'text',
    value = $bindable(''),
    placeholder,
    required,
    invalid,
    describedBy,
    class: className = '',
    oninput,
    min,
    max,
    step,
    disabled = false,
    readonly = false,
    form,
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

<input
  {id}
  {name}
  {type}
  bind:value
  {placeholder}
  required={isRequired}
  class={fullClass}
  {disabled}
  {readonly}
  {min}
  {max}
  {step}
  {form}
  aria-invalid={isInvalid ? 'true' : undefined}
  aria-describedby={ariaDescribedBy}
  oninput={(e) => {
    oninput?.(e);
  }}
/>
