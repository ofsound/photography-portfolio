<script lang="ts">
  import { Svedit } from 'svedit';

  import {
    createDefaultSveditPageDocument,
    parseSveditPageDocument,
  } from '$lib/svedit/page-document';
  import { createPageSveditSession } from '$lib/svedit/page-session';

  const { page, sectionClass, sectionStyle } = $props<{
    page: {
      svedit_doc: unknown;
    };
    sectionClass?: string;
    sectionStyle?: string;
  }>();

  const parsedDocument = $derived(parseSveditPageDocument(page.svedit_doc));
  const document = $derived(
    parsedDocument.ok
      ? parsedDocument.document
      : createDefaultSveditPageDocument(),
  );
  const session = $derived(createPageSveditSession(document));
</script>

<section
  class={sectionClass ?? 'mx-auto w-full px-5 py-10'}
  style={sectionStyle}
>
  <Svedit
    {session}
    editable={false}
    path={[session.document_id]}
    class="text-text-main grid gap-8 sm:gap-10"
    spellcheck="false"
    autocapitalize="off"
  />

  {#if !parsedDocument.ok}
    <p class="mt-3 text-xs text-red-600">
      Invalid Svedit document was detected and replaced with a default view.
    </p>
  {/if}
</section>
