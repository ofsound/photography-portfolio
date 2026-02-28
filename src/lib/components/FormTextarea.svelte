<script lang="ts">
  const baseClass =
    'w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted';

  type Props = {
    id?: string;
    name?: string;
    value?: string;
    rows?: number;
    placeholder?: string;
    required?: boolean;
    class?: string;
    disabled?: boolean;
    readonly?: boolean;
    form?: string;
  };

  let {
    id,
    name,
    value = $bindable(''),
    rows = 4,
    placeholder,
    required = false,
    class: className = '',
    disabled = false,
    readonly = false,
    form
  }: Props = $props();

  const fullClass = $derived(`${baseClass} ${className}`.trim());
</script>

<textarea
  {id}
  {name}
  bind:value
  {rows}
  {placeholder}
  {required}
  class={fullClass}
  {disabled}
  {readonly}
  {form}
></textarea>
