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
import Heading from '$lib/components/svedit/nodes/Heading.svelte';
import Image from '$lib/components/svedit/nodes/Image.svelte';
import List from '$lib/components/svedit/nodes/List.svelte';
import ListItem from '$lib/components/svedit/nodes/ListItem.svelte';
import Page from '$lib/components/svedit/nodes/Page.svelte';
import Paragraph from '$lib/components/svedit/nodes/Paragraph.svelte';
import Quote from '$lib/components/svedit/nodes/Quote.svelte';
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

const insertTextNode = (
  tr: any,
  node: { id: string; type: string; content: SveditAnnotatedText } & Record<
    string,
    unknown
  >,
) => {
  if (tr.selection?.type !== 'node') return;

  const nodeArrayPath = [...tr.selection.path];
  const insertIndex = Math.min(
    tr.selection.anchor_offset,
    tr.selection.focus_offset,
  );

  tr.create(node);
  tr.insert_nodes([node.id]);
  focusInsertedText(
    tr,
    [...nodeArrayPath, insertIndex, 'content'],
    node.content,
  );
};

const createInserters = () => ({
  paragraph: (
    tr: any,
    content: SveditAnnotatedText = createDefaultAnnotatedText(),
  ) => {
    insertTextNode(tr, {
      id: tr.generate_id(),
      type: 'paragraph',
      content,
    });
  },

  heading: (
    tr: any,
    content: SveditAnnotatedText = createDefaultAnnotatedText(),
  ) => {
    insertTextNode(tr, {
      id: tr.generate_id(),
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
      id: tr.generate_id(),
      type: 'list_item',
      content,
    });
  },

  list: (tr: any) => {
    if (tr.selection?.type !== 'node') return;

    const nodeArrayPath = [...tr.selection.path];
    const insertIndex = Math.min(
      tr.selection.anchor_offset,
      tr.selection.focus_offset,
    );

    const itemId = tr.generate_id();
    const listId = tr.generate_id();

    tr.create({
      id: itemId,
      type: 'list_item',
      content: createDefaultAnnotatedText('List item'),
    });

    tr.create({
      id: listId,
      type: 'list',
      list_items: [itemId],
    });

    tr.insert_nodes([listId]);
    focusInsertedText(
      tr,
      [...nodeArrayPath, insertIndex, 'list_items', 0, 'content'],
      createDefaultAnnotatedText('List item'),
    );
  },

  quote: (tr: any) => {
    if (tr.selection?.type !== 'node') return;

    const nodeArrayPath = [...tr.selection.path];
    const insertIndex = Math.min(
      tr.selection.anchor_offset,
      tr.selection.focus_offset,
    );
    const quoteId = tr.generate_id();

    tr.create({
      id: quoteId,
      type: 'quote',
      content: createDefaultAnnotatedText('Quote text'),
      citation: createDefaultAnnotatedText('Attribution'),
    });

    tr.insert_nodes([quoteId]);
    focusInsertedText(
      tr,
      [...nodeArrayPath, insertIndex, 'content'],
      createDefaultAnnotatedText('Quote text'),
    );
  },

  image: (tr: any) => {
    if (tr.selection?.type !== 'node') return;

    const imageSrc =
      typeof window === 'undefined'
        ? ''
        : (window.prompt('Image URL', 'https://')?.trim() ?? '');
    if (!imageSrc || !isSafeSveditHref(imageSrc)) return;

    const imageAlt =
      typeof window === 'undefined'
        ? ''
        : (window.prompt('Alt text', '')?.trim() ?? '');

    const nodeArrayPath = [...tr.selection.path];
    const insertIndex = Math.min(
      tr.selection.anchor_offset,
      tr.selection.focus_offset,
    );
    const imageId = tr.generate_id();

    tr.create({
      id: imageId,
      type: 'image',
      src: createDefaultAnnotatedText(imageSrc),
      alt: createDefaultAnnotatedText(imageAlt),
      caption: createDefaultAnnotatedText(''),
    });

    tr.insert_nodes([imageId]);
    focusInsertedText(
      tr,
      [...nodeArrayPath, insertIndex, 'caption'],
      createDefaultAnnotatedText(''),
    );
  },

  divider: (tr: any) => {
    if (tr.selection?.type !== 'node') return;

    const dividerId = tr.generate_id();
    tr.create({ id: dividerId, type: 'divider' });
    tr.insert_nodes([dividerId]);
  },

  callout: (tr: any) => {
    if (tr.selection?.type !== 'node') return;

    const nodeArrayPath = [...tr.selection.path];
    const insertIndex = Math.min(
      tr.selection.anchor_offset,
      tr.selection.focus_offset,
    );
    const calloutId = tr.generate_id();

    tr.create({
      id: calloutId,
      type: 'callout',
      title: createDefaultAnnotatedText('Callout title'),
      content: createDefaultAnnotatedText('Callout copy goes here.'),
      button_label: createDefaultAnnotatedText('Learn more'),
      button_href: createDefaultAnnotatedText('https://'),
    });

    tr.insert_nodes([calloutId]);
    focusInsertedText(
      tr,
      [...nodeArrayPath, insertIndex, 'content'],
      createDefaultAnnotatedText('Callout copy goes here.'),
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
    return (
      this.context.editable && this.context.session.can_insert(this.nodeType)
    );
  }

  execute() {
    const session = this.context.session;
    const tr = session.tr;

    if (session.selection?.type !== 'node') {
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
  active = $derived(Boolean(this.context.session.active_annotation('link')));

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
  system_components: {
    NodeCursorTrap,
    Overlays,
  },
  node_components: {
    Page,
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
