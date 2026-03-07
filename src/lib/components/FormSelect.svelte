<script lang="ts">
  import type { Snippet } from 'svelte';

  import { formControlBaseClass } from '$lib/constants/form';

  type Props = {
    id?: string;
    name?: string;
    value?: string;
    required?: boolean;
    class?: string;
    disabled?: boolean;
    form?: string;
    children: Snippet;
  };

  let {
    id,
    name,
    value = $bindable(''),
    required = false,
    class: className = '',
    disabled = false,
    form,
    children,
  }: Props = $props();

  const fullClass = $derived(`${formControlBaseClass} ${className}`.trim());
</script>

<select {id} {name} bind:value {required} class={fullClass} {disabled} {form}>
  {@render children()}
</select>
