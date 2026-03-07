<script lang="ts">
  import { formControlBaseClass } from '$lib/constants/form';

  type Props = {
    id?: string;
    name?: string;
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
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
    required = false,
    class: className = '',
    oninput,
    min,
    max,
    step,
    disabled = false,
    readonly = false,
    form,
  }: Props = $props();

  const fullClass = $derived(`${formControlBaseClass} ${className}`.trim());
</script>

<input
  {id}
  {name}
  {type}
  bind:value
  {placeholder}
  {required}
  class={fullClass}
  {disabled}
  {readonly}
  {min}
  {max}
  {step}
  {form}
  oninput={(e) => {
    oninput?.(e);
  }}
/>
