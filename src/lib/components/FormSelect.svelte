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

  import type { HTMLSelectAttributes } from 'svelte/elements';

  type Props = Omit<HTMLSelectAttributes, 'value'> & {
    value?: string;
    invalid?: boolean;
    describedBy?: string;
    children: Snippet;
  };

  let {
    value = $bindable(''),
    invalid,
    describedBy,
    class: className = '',
    children,
    ...rest
  }: Props = $props();

  const fieldContext = getContext<FormFieldContextResolver | undefined>(
    formFieldContextKey,
  );
  const contextState = $derived(fieldContext?.());
  const isRequired = $derived(rest.required ?? contextState?.required ?? false);
  const isInvalid = $derived(invalid ?? contextState?.invalid ?? false);
  const ariaDescribedBy = $derived.by(() => {
    const ids = [describedBy, contextState?.describedBy]
      .filter(Boolean)
      .flatMap((v) => String(v).split(/\s+/g))
      .filter(Boolean);

    if (!ids.length) return undefined;

    return [...new Set(ids)].join(' ');
  });
  const fullClass = $derived(
    `${formControlBaseClass} ${isInvalid ? formControlInvalidClass : ''} ${className}`.trim(),
  );
</script>

<select
  {...rest}
  bind:value
  required={isRequired}
  class={fullClass}
  aria-invalid={isInvalid ? 'true' : undefined}
  aria-describedby={ariaDescribedBy}
>
  {@render children()}
</select>
