<script lang="ts">
  import { AnnotatedTextProperty, Node } from 'svedit';

  const { path } = $props<{ path: Array<string | number> }>();
</script>

<Node
  {path}
  class="rounded-md border-l-4 border-border-strong bg-surface/60 px-4 py-3"
>
  <AnnotatedTextProperty
    tag="blockquote"
    path={[...path, 'content']}
    class="text-text-main text-lg leading-8"
    placeholder="Quote"
  />
  <AnnotatedTextProperty
    tag="p"
    path={[...path, 'citation']}
    class="mt-2 text-sm tracking-wide text-text-muted uppercase"
    placeholder="Citation"
  />
</Node>
