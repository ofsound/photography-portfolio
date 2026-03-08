<script lang="ts">
  const { content } = $props<{
    path: Array<string | number>;
    content: string;
  }>();
</script>

<strong>{content}</strong>
