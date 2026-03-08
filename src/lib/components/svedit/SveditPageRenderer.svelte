<script lang="ts">
  import { Svedit } from 'svedit';

  import {
    createDefaultSveditPageDocument,
    parseSveditPageDocument,
  } from '$lib/svedit/page-document';
  import { createPageSveditSession } from '$lib/svedit/page-session';

  const { page } = $props<{
    page: {
      title: string;
      svedit_doc: unknown;
    };
  }>();

  const parsedDocument = $derived(parseSveditPageDocument(page.svedit_doc));
  const document = $derived(
    parsedDocument.ok
      ? parsedDocument.document
      : createDefaultSveditPageDocument(),
  );
  const session = $derived(createPageSveditSession(document));
</script>

<section class="mx-auto max-w-5xl px-5 py-14">
  <h1 class="text-3xl tracking-widest uppercase">{page.title}</h1>

  <div class="mt-6">
    <Svedit
      {session}
      editable={false}
      path={[session.document_id]}
      class="text-text-main grid gap-6"
      spellcheck="false"
      autocapitalize="off"
    />
  </div>

  {#if !parsedDocument.ok}
    <p class="mt-3 text-xs text-red-600">
      Invalid Svedit document was detected and replaced with a default view.
    </p>
  {/if}
</section>
