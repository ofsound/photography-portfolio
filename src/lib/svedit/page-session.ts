import {
  AddNewLineCommand,
  BreakTextNodeCommand,
  Command,
  InsertDefaultNodeCommand,
  RedoCommand,
  SelectAllCommand,
  SelectParentCommand,
  Session,
  ToggleAnnotationCommand,
  UndoCommand,
  define_keymap,
} from 'svedit';

import Emphasis from '$lib/components/svedit/annotations/Emphasis.svelte';
import Link from '$lib/components/svedit/annotations/Link.svelte';
import Strong from '$lib/components/svedit/annotations/Strong.svelte';
import Callout from '$lib/components/svedit/nodes/Callout.svelte';
import Divider from '$lib/components/svedit/nodes/Divider.svelte';
import Feature from '$lib/components/svedit/nodes/Feature.svelte';
import Heading from '$lib/components/svedit/nodes/Heading.svelte';
import Hero from '$lib/components/svedit/nodes/Hero.svelte';
import Image from '$lib/components/svedit/nodes/Image.svelte';
import List from '$lib/components/svedit/nodes/List.svelte';
import ListItem from '$lib/components/svedit/nodes/ListItem.svelte';
import Page from '$lib/components/svedit/nodes/Page.svelte';
import Paragraph from '$lib/components/svedit/nodes/Paragraph.svelte';
import Quote from '$lib/components/svedit/nodes/Quote.svelte';
import Section from '$lib/components/svedit/nodes/Section.svelte';
import NodeCursorTrap from '$lib/components/svedit/system/NodeCursorTrap.svelte';
import Overlays from '$lib/components/svedit/system/Overlays.svelte';
import {
  createDefaultAnnotatedText,
  isSafeSveditHref,
  PAGE_SVEDIT_SCHEMA,
  type SveditAnnotatedText,
  type SveditPageDocument,
} from '$lib/svedit/page-document';

const focusInsertedText = (
  tr: any,
  path: Array<string | number>,
  content: SveditAnnotatedText,
) => {
  tr.set_selection({
    type: 'text',
    path,
    anchor_offset: content.text.length,
    focus_offset: content.text.length,
  });
};

const generateNodeId = () => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `node_${Date.now()}_${randomPart}`;
};

const generateNodeIdFromContext = (tr: any): string => {
  if (typeof tr?.session?.generate_id === 'function') {
    return tr.session.generate_id();
  }
  if (typeof tr?.config?.generate_id === 'function') {
    return tr.config.generate_id();
  }
  if (typeof tr?.config?.generate_node_id === 'function') {
    return tr.config.generate_node_id();
  }
  if (typeof tr?.generate_id === 'function') {
    return tr.generate_id();
  }

  return generateNodeId();
};

const ensureNodeInsertTarget = (tr: any) => {
  if (tr.selection?.type !== 'node') return null;

  const path = [...tr.selection.path];
  const insertIndex = Math.min(
    tr.selection.anchor_offset,
    tr.selection.focus_offset,
  );

  return { path, insertIndex };
};

const insertTextNode = (
  tr: any,
  node: { id: string; type: string; content: SveditAnnotatedText } & Record<
    string,
    unknown
  >,
) => {
  const target = ensureNodeInsertTarget(tr);
  if (!target) return;

  tr.create(node);
  tr.insert_nodes([node.id]);
  focusInsertedText(
    tr,
    [...target.path, target.insertIndex, 'content'],
    node.content,
  );
};

const createInserters = () => ({
  hero: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const heroId = generateNodeIdFromContext(tr);
    const heading = createDefaultAnnotatedText('Add your page headline');

    tr.create({
      id: heroId,
      type: 'hero',
      eyebrow: createDefaultAnnotatedText('Featured'),
      heading,
      subheading: createDefaultAnnotatedText(
        'Write a clear value statement for this page.',
      ),
      button_label: createDefaultAnnotatedText('Learn more'),
      button_href: createDefaultAnnotatedText('/contact'),
      background_image: createDefaultAnnotatedText(''),
    });

    tr.insert_nodes([heroId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'heading'],
      heading,
    );
  },

  section: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const sectionId = generateNodeIdFromContext(tr);
    const content = createDefaultAnnotatedText(
      'Write section content that supports the page goal.',
    );

    tr.create({
      id: sectionId,
      type: 'section',
      heading: createDefaultAnnotatedText('Section heading'),
      content,
    });

    tr.insert_nodes([sectionId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'content'],
      content,
    );
  },

  feature: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const featureId = generateNodeIdFromContext(tr);
    const content = createDefaultAnnotatedText(
      'Describe the offer, session type, or key deliverable.',
    );

    tr.create({
      id: featureId,
      type: 'feature',
      heading: createDefaultAnnotatedText('Feature heading'),
      content,
      image_src: createDefaultAnnotatedText(''),
      image_alt: createDefaultAnnotatedText('Feature image'),
      button_label: createDefaultAnnotatedText('Book now'),
      button_href: createDefaultAnnotatedText('/contact'),
    });

    tr.insert_nodes([featureId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'content'],
      content,
    );
  },

  paragraph: (
    tr: any,
    content: SveditAnnotatedText = createDefaultAnnotatedText(),
  ) => {
    insertTextNode(tr, {
      id: generateNodeIdFromContext(tr),
      type: 'paragraph',
      content,
    });
  },

  heading: (
    tr: any,
    content: SveditAnnotatedText = createDefaultAnnotatedText(),
  ) => {
    insertTextNode(tr, {
      id: generateNodeIdFromContext(tr),
      type: 'heading',
      level: 2,
      content,
    });
  },

  list_item: (
    tr: any,
    content: SveditAnnotatedText = createDefaultAnnotatedText(),
  ) => {
    insertTextNode(tr, {
      id: generateNodeIdFromContext(tr),
      type: 'list_item',
      content,
    });
  },

  list: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const itemId = generateNodeIdFromContext(tr);
    const listId = generateNodeIdFromContext(tr);
    const listItemContent = createDefaultAnnotatedText('List item');

    tr.create({
      id: itemId,
      type: 'list_item',
      content: listItemContent,
    });

    tr.create({
      id: listId,
      type: 'list',
      list_items: [itemId],
    });

    tr.insert_nodes([listId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'list_items', 0, 'content'],
      listItemContent,
    );
  },

  quote: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const quoteId = generateNodeIdFromContext(tr);
    const quoteContent = createDefaultAnnotatedText('Quote text');

    tr.create({
      id: quoteId,
      type: 'quote',
      content: quoteContent,
      citation: createDefaultAnnotatedText('Attribution'),
    });

    tr.insert_nodes([quoteId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'content'],
      quoteContent,
    );
  },

  image: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const imageSrc =
      typeof window === 'undefined'
        ? ''
        : (window.prompt('Image URL', 'https://')?.trim() ?? '');
    if (!imageSrc || !isSafeSveditHref(imageSrc)) return;

    const imageAlt =
      typeof window === 'undefined'
        ? ''
        : (window.prompt('Alt text', '')?.trim() ?? '');

    const imageId = generateNodeIdFromContext(tr);
    const caption = createDefaultAnnotatedText('');

    tr.create({
      id: imageId,
      type: 'image',
      src: createDefaultAnnotatedText(imageSrc),
      alt: createDefaultAnnotatedText(imageAlt),
      caption,
    });

    tr.insert_nodes([imageId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'caption'],
      caption,
    );
  },

  divider: (tr: any) => {
    if (tr.selection?.type !== 'node') return;

    const dividerId = generateNodeIdFromContext(tr);
    tr.create({ id: dividerId, type: 'divider' });
    tr.insert_nodes([dividerId]);
  },

  callout: (tr: any) => {
    const target = ensureNodeInsertTarget(tr);
    if (!target) return;

    const calloutId = generateNodeIdFromContext(tr);
    const content = createDefaultAnnotatedText('Callout copy goes here.');

    tr.create({
      id: calloutId,
      type: 'callout',
      title: createDefaultAnnotatedText('Callout title'),
      content,
      button_label: createDefaultAnnotatedText('Learn more'),
      button_href: createDefaultAnnotatedText('/contact'),
    });

    tr.insert_nodes([calloutId]);
    focusInsertedText(
      tr,
      [...target.path, target.insertIndex, 'content'],
      content,
    );
  },
});

class InsertNodeTypeCommand extends Command {
  nodeType: string;

  constructor(nodeType: string, context: any) {
    super(context);
    this.nodeType = nodeType;
  }

  is_enabled() {
    if (!this.context.editable) return false;

    // If there's a selection, check if insertion is possible there
    if (this.context.session.selection) {
      return this.context.session.can_insert(this.nodeType);
    }

    // If no selection, we'll default to the document body if the node type is valid for it
    const schema = this.context.session.schema.page;
    return schema.properties.body.node_types.includes(this.nodeType);
  }

  execute() {
    const session = this.context.session;
    const tr = session.tr;

    if (!session.selection) {
      // Default to end of document body
      const bodyPath = [session.document_id, 'body'];
      const body = session.get(bodyPath);
      tr.set_selection({
        type: 'node',
        path: bodyPath,
        anchor_offset: body.length,
        focus_offset: body.length,
      });
    } else if (session.selection.type !== 'node') {
      const nextCursor = session.get_next_node_insert_cursor(session.selection);
      if (!nextCursor) return;
      tr.set_selection(nextCursor);
    }

    const inserter = session.config.inserters?.[this.nodeType];
    if (!inserter) return;

    inserter(tr);
    session.apply(tr);
  }
}

class SetLinkCommand extends Command {
  get active() {
    return Boolean(this.context.session.active_annotation('link'));
  }

  is_enabled() {
    const { editable, session } = this.context;
    const selection = session.selection;
    if (!editable || selection?.type !== 'text') return false;

    const hasLink = Boolean(session.active_annotation('link'));
    const collapsed = selection.anchor_offset === selection.focus_offset;
    return hasLink || !collapsed;
  }

  execute() {
    const session = this.context.session;
    const activeLink = session.active_annotation('link');
    const activeLinkNode = activeLink ? session.get(activeLink.node_id) : null;

    const defaultHref =
      activeLinkNode && typeof activeLinkNode.href === 'string'
        ? activeLinkNode.href
        : 'https://';

    const inputHref =
      typeof window === 'undefined'
        ? null
        : window.prompt('Link URL (leave empty to remove link)', defaultHref);
    if (inputHref === null) return;

    const href = inputHref.trim();
    const tr = session.tr;

    if (!href && activeLink) {
      tr.annotate_text('link');
      session.apply(tr);
      return;
    }

    if (!isSafeSveditHref(href)) return;

    tr.annotate_text('link', { href });
    session.apply(tr);
  }
}

const createCommandsAndKeymap = (context: any) => {
  const commands = {
    undo: new UndoCommand(context),
    redo: new RedoCommand(context),
    select_parent: new SelectParentCommand(context),
    select_all: new SelectAllCommand(context),
    add_new_line: new AddNewLineCommand(context),
    break_text_node: new BreakTextNodeCommand(context),
    insert_default_node: new InsertDefaultNodeCommand(context),

    toggle_strong: new ToggleAnnotationCommand('strong', context),
    toggle_emphasis: new ToggleAnnotationCommand('emphasis', context),
    set_link: new SetLinkCommand(context),

    insert_hero: new InsertNodeTypeCommand('hero', context),
    insert_section: new InsertNodeTypeCommand('section', context),
    insert_feature: new InsertNodeTypeCommand('feature', context),
    insert_heading: new InsertNodeTypeCommand('heading', context),
    insert_paragraph: new InsertNodeTypeCommand('paragraph', context),
    insert_list: new InsertNodeTypeCommand('list', context),
    insert_quote: new InsertNodeTypeCommand('quote', context),
    insert_image: new InsertNodeTypeCommand('image', context),
    insert_divider: new InsertNodeTypeCommand('divider', context),
    insert_callout: new InsertNodeTypeCommand('callout', context),
  };

  const keymap = define_keymap({
    'meta+z,ctrl+z': [commands.undo],
    'meta+shift+z,ctrl+shift+z': [commands.redo],
    'meta+y,ctrl+y': [commands.redo],
    'meta+b,ctrl+b': [commands.toggle_strong],
    'meta+i,ctrl+i': [commands.toggle_emphasis],
    'meta+k,ctrl+k': [commands.set_link],
    enter: [commands.break_text_node],
    'shift+enter': [commands.add_new_line],
    tab: [commands.insert_default_node],
    'meta+a,ctrl+a': [commands.select_all],
  });

  return { commands, keymap };
};

const createPageSessionConfig = () => ({
  generate_id: generateNodeId,
  generate_node_id: generateNodeId,
  system_components: {
    NodeCursorTrap,
    Overlays,
  },
  node_components: {
    Page,
    Hero,
    Section,
    Feature,
    Heading,
    Paragraph,
    List,
    ListItem,
    Quote,
    Image,
    Divider,
    Callout,
    Strong,
    Emphasis,
    Link,
  },
  inserters: createInserters(),
  create_commands_and_keymap: createCommandsAndKeymap,
});

export const createPageSveditSession = (document: SveditPageDocument) => {
  return new Session(
    PAGE_SVEDIT_SCHEMA as any,
    document,
    createPageSessionConfig(),
  );
};
