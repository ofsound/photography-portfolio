const ANNOTATION_TYPES = ['strong', 'emphasis', 'link'] as const;
const BLOCK_TYPES = [
  'hero',
  'section',
  'feature',
  'heading',
  'paragraph',
  'list',
  'quote',
  'image',
  'divider',
  'callout',
] as const;

type AnnotationType = (typeof ANNOTATION_TYPES)[number];
type SveditBlockType = (typeof BLOCK_TYPES)[number];

type AnnotatedTextAnnotation = {
  start_offset: number;
  end_offset: number;
  node_id: string;
};

export type SveditAnnotatedText = {
  text: string;
  annotations: AnnotatedTextAnnotation[];
};

type SveditPageNode = {
  id: string;
  type: 'page';
  body: string[];
};

type SveditHeroNode = {
  id: string;
  type: 'hero';
  eyebrow: SveditAnnotatedText;
  heading: SveditAnnotatedText;
  subheading: SveditAnnotatedText;
  button_label: SveditAnnotatedText;
  button_href: SveditAnnotatedText;
  background_image: SveditAnnotatedText;
};

type SveditSectionNode = {
  id: string;
  type: 'section';
  heading: SveditAnnotatedText;
  content: SveditAnnotatedText;
};

type SveditFeatureNode = {
  id: string;
  type: 'feature';
  heading: SveditAnnotatedText;
  content: SveditAnnotatedText;
  image_src: SveditAnnotatedText;
  image_alt: SveditAnnotatedText;
  button_label: SveditAnnotatedText;
  button_href: SveditAnnotatedText;
};

type SveditHeadingNode = {
  id: string;
  type: 'heading';
  level: number;
  content: SveditAnnotatedText;
};

type SveditParagraphNode = {
  id: string;
  type: 'paragraph';
  content: SveditAnnotatedText;
};

type SveditListNode = {
  id: string;
  type: 'list';
  list_items: string[];
};

type SveditListItemNode = {
  id: string;
  type: 'list_item';
  content: SveditAnnotatedText;
};

type SveditQuoteNode = {
  id: string;
  type: 'quote';
  content: SveditAnnotatedText;
  citation: SveditAnnotatedText;
};

type SveditImageNode = {
  id: string;
  type: 'image';
  src: SveditAnnotatedText;
  alt: SveditAnnotatedText;
  caption: SveditAnnotatedText;
};

type SveditDividerNode = {
  id: string;
  type: 'divider';
};

type SveditCalloutNode = {
  id: string;
  type: 'callout';
  title: SveditAnnotatedText;
  content: SveditAnnotatedText;
  button_label: SveditAnnotatedText;
  button_href: SveditAnnotatedText;
};

type SveditStrongAnnotationNode = {
  id: string;
  type: 'strong';
};

type SveditEmphasisAnnotationNode = {
  id: string;
  type: 'emphasis';
};

type SveditLinkAnnotationNode = {
  id: string;
  type: 'link';
  href: string;
};

export type SveditPageNodeRecord =
  | SveditPageNode
  | SveditHeroNode
  | SveditSectionNode
  | SveditFeatureNode
  | SveditHeadingNode
  | SveditParagraphNode
  | SveditListNode
  | SveditListItemNode
  | SveditQuoteNode
  | SveditImageNode
  | SveditDividerNode
  | SveditCalloutNode
  | SveditStrongAnnotationNode
  | SveditEmphasisAnnotationNode
  | SveditLinkAnnotationNode;

export type SveditPageDocument = {
  document_id: string;
  nodes: Record<string, SveditPageNodeRecord>;
};

export const SVEDIT_PAGE_SCHEMA_VERSION = 1;

export const PAGE_SVEDIT_SCHEMA = {
  page: {
    kind: 'document',
    properties: {
      body: {
        type: 'node_array',
        node_types: [...BLOCK_TYPES],
        default_node_type: 'section',
      },
    },
  },
  hero: {
    kind: 'block',
    properties: {
      eyebrow: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
      heading: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
      subheading: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
      button_label: {
        type: 'annotated_text',
        allow_newlines: false,
      },
      button_href: {
        type: 'annotated_text',
        allow_newlines: false,
      },
      background_image: {
        type: 'annotated_text',
        allow_newlines: false,
      },
    },
  },
  section: {
    kind: 'block',
    properties: {
      heading: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
      content: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
    },
  },
  feature: {
    kind: 'block',
    properties: {
      heading: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
      content: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
      image_src: {
        type: 'annotated_text',
        allow_newlines: false,
      },
      image_alt: {
        type: 'annotated_text',
        allow_newlines: false,
      },
      button_label: {
        type: 'annotated_text',
        allow_newlines: false,
      },
      button_href: {
        type: 'annotated_text',
        allow_newlines: false,
      },
    },
  },
  heading: {
    kind: 'text',
    properties: {
      level: { type: 'integer', default: 2 },
      content: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
    },
  },
  paragraph: {
    kind: 'text',
    properties: {
      content: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
    },
  },
  list: {
    kind: 'block',
    properties: {
      list_items: {
        type: 'node_array',
        node_types: ['list_item'],
        default_node_type: 'list_item',
      },
    },
  },
  list_item: {
    kind: 'text',
    properties: {
      content: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
    },
  },
  quote: {
    kind: 'block',
    properties: {
      content: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
      citation: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
    },
  },
  image: {
    kind: 'block',
    properties: {
      src: { type: 'annotated_text', allow_newlines: false },
      alt: { type: 'annotated_text', allow_newlines: false },
      caption: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
    },
  },
  divider: {
    kind: 'block',
    properties: {},
  },
  callout: {
    kind: 'block',
    properties: {
      title: {
        type: 'annotated_text',
        allow_newlines: false,
        node_types: [...ANNOTATION_TYPES],
      },
      content: {
        type: 'annotated_text',
        allow_newlines: true,
        node_types: [...ANNOTATION_TYPES],
      },
      button_label: {
        type: 'annotated_text',
        allow_newlines: false,
      },
      button_href: {
        type: 'annotated_text',
        allow_newlines: false,
      },
    },
  },
  strong: {
    kind: 'annotation',
    properties: {},
  },
  emphasis: {
    kind: 'annotation',
    properties: {},
  },
  link: {
    kind: 'annotation',
    properties: {
      href: { type: 'string', default: '' },
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asCharLength = (value: string) => Array.from(value).length;

const asAnnotatedText = (
  value: unknown,
  field: string,
  nodes: Record<string, unknown>,
  allowedAnnotations: readonly AnnotationType[],
): { ok: true; data: SveditAnnotatedText } | { ok: false; message: string } => {
  if (!isRecord(value)) {
    return { ok: false, message: `${field} must be an object.` };
  }

  const text = value.text;
  const annotations = value.annotations;

  if (typeof text !== 'string') {
    return { ok: false, message: `${field}.text must be a string.` };
  }

  if (!Array.isArray(annotations)) {
    return { ok: false, message: `${field}.annotations must be an array.` };
  }

  const textLength = asCharLength(text);
  const parsedAnnotations: AnnotatedTextAnnotation[] = [];

  for (const [index, annotation] of annotations.entries()) {
    if (!isRecord(annotation)) {
      return {
        ok: false,
        message: `${field}.annotations[${index}] must be an object.`,
      };
    }

    const startOffset = annotation.start_offset;
    const endOffset = annotation.end_offset;
    const nodeId = annotation.node_id;

    if (
      typeof startOffset !== 'number' ||
      typeof endOffset !== 'number' ||
      !Number.isInteger(startOffset) ||
      !Number.isInteger(endOffset)
    ) {
      return {
        ok: false,
        message: `${field}.annotations[${index}] must use integer offsets.`,
      };
    }

    if (typeof nodeId !== 'string' || !nodeId.trim()) {
      return {
        ok: false,
        message: `${field}.annotations[${index}].node_id is required.`,
      };
    }

    if (startOffset < 0 || endOffset <= startOffset || endOffset > textLength) {
      return {
        ok: false,
        message: `${field}.annotations[${index}] has invalid offsets.`,
      };
    }

    const referencedNode = nodes[nodeId];
    if (!isRecord(referencedNode) || typeof referencedNode.type !== 'string') {
      return {
        ok: false,
        message: `${field}.annotations[${index}] references a missing annotation node.`,
      };
    }

    const annotationType = referencedNode.type;
    if (!allowedAnnotations.includes(annotationType as AnnotationType)) {
      return {
        ok: false,
        message: `${field}.annotations[${index}] uses unsupported annotation type ${annotationType}.`,
      };
    }

    parsedAnnotations.push({
      start_offset: startOffset,
      end_offset: endOffset,
      node_id: nodeId,
    });
  }

  return {
    ok: true,
    data: {
      text,
      annotations: parsedAnnotations,
    },
  };
};

export const isSafeSveditHref = (href: string) => {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith('#')) return true;
  if (value.startsWith('/')) return !value.startsWith('//');
  if (value.startsWith('./') || value.startsWith('../')) return true;

  const schemeMatch = value.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) return true;

  const scheme = schemeMatch[1]?.toLowerCase();
  return scheme === 'http' || scheme === 'https' || scheme === 'mailto';
};

export const sanitizeSveditHref = (href: string | null | undefined) => {
  if (!href) return '#';
  return isSafeSveditHref(href) ? href : '#';
};

const parseSafeHrefProperty = (
  value: unknown,
  field: string,
  nodes: Record<string, unknown>,
  options: { allowEmpty: boolean },
) => {
  const parsed = asAnnotatedText(value, field, nodes, []);
  if (!parsed.ok) return parsed;

  const hrefText = parsed.data.text.trim();
  if (!hrefText && options.allowEmpty) {
    return { ok: true, data: parsed.data } as const;
  }

  if (!hrefText || !isSafeSveditHref(hrefText)) {
    return {
      ok: false,
      message: `${field} must be ${options.allowEmpty ? 'empty or ' : ''}a safe URL.`,
    } as const;
  }

  return { ok: true, data: parsed.data } as const;
};

const extractNodeReferences = (node: SveditPageNodeRecord) => {
  const refs: string[] = [];

  if (node.type === 'page') refs.push(...node.body);
  if (node.type === 'list') refs.push(...node.list_items);

  return refs;
};

const checkNodeReferences = (nodes: Record<string, SveditPageNodeRecord>) => {
  for (const [nodeId, node] of Object.entries(nodes)) {
    for (const ref of extractNodeReferences(node)) {
      const referenced = nodes[ref];
      if (!referenced) {
        return {
          ok: false,
          message: `Node ${nodeId} references missing node ${ref}.`,
        } as const;
      }
    }

    if (node.type === 'page') {
      for (const childId of node.body) {
        const child = nodes[childId];
        if (!child || !BLOCK_TYPES.includes(child.type as SveditBlockType)) {
          return {
            ok: false,
            message: `Page body can only contain block nodes.`,
          } as const;
        }
      }
    }

    if (node.type === 'list') {
      for (const childId of node.list_items) {
        const child = nodes[childId];
        if (!child || child.type !== 'list_item') {
          return {
            ok: false,
            message: `List nodes can only contain list_item children.`,
          } as const;
        }
      }
    }
  }

  return { ok: true } as const;
};

const ensureReachableAcyclic = (
  documentId: string,
  nodes: Record<string, SveditPageNodeRecord>,
) => {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (
    nodeId: string,
  ): { ok: true } | { ok: false; message: string } => {
    if (visiting.has(nodeId)) {
      return {
        ok: false,
        message: `Cycle detected at node ${nodeId}.`,
      };
    }

    if (visited.has(nodeId)) return { ok: true };

    visiting.add(nodeId);
    const node = nodes[nodeId];
    if (!node) {
      return {
        ok: false,
        message: `Missing node ${nodeId}.`,
      };
    }

    for (const ref of extractNodeReferences(node)) {
      const result = visit(ref);
      if (!result.ok) return result;
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return { ok: true };
  };

  const traversal = visit(documentId);
  if (!traversal.ok) return traversal;

  const orphaned = Object.keys(nodes).filter((nodeId) => !visited.has(nodeId));
  if (orphaned.length > 0) {
    return {
      ok: false,
      message: `Document contains orphaned nodes: ${orphaned.join(', ')}.`,
    } as const;
  }

  return { ok: true } as const;
};

const parsePageNode = (
  node: Record<string, unknown>,
  nodes: Record<string, unknown>,
):
  | { ok: true; data: SveditPageNodeRecord }
  | { ok: false; message: string } => {
  const id = node.id;
  const type = node.type;

  if (typeof id !== 'string' || !id.trim()) {
    return { ok: false, message: 'Each node requires a non-empty id.' };
  }

  if (typeof type !== 'string' || !type.trim()) {
    return { ok: false, message: `Node ${id} is missing type.` };
  }

  if (type === 'page') {
    const body = node.body;
    if (
      !Array.isArray(body) ||
      !body.every((entry) => typeof entry === 'string')
    ) {
      return { ok: false, message: `Node ${id}.body must be a string array.` };
    }
    return { ok: true, data: { id, type, body } };
  }

  if (type === 'hero') {
    const eyebrow = asAnnotatedText(
      node.eyebrow,
      `${id}.eyebrow`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!eyebrow.ok) return eyebrow;

    const heading = asAnnotatedText(
      node.heading,
      `${id}.heading`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!heading.ok) return heading;

    const subheading = asAnnotatedText(
      node.subheading,
      `${id}.subheading`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!subheading.ok) return subheading;

    const buttonLabel = asAnnotatedText(
      node.button_label,
      `${id}.button_label`,
      nodes,
      [],
    );
    if (!buttonLabel.ok) return buttonLabel;

    const buttonHref = parseSafeHrefProperty(
      node.button_href,
      `${id}.button_href`,
      nodes,
      { allowEmpty: true },
    );
    if (!buttonHref.ok) return buttonHref;

    const backgroundImage = parseSafeHrefProperty(
      node.background_image,
      `${id}.background_image`,
      nodes,
      { allowEmpty: true },
    );
    if (!backgroundImage.ok) return backgroundImage;

    return {
      ok: true,
      data: {
        id,
        type,
        eyebrow: eyebrow.data,
        heading: heading.data,
        subheading: subheading.data,
        button_label: buttonLabel.data,
        button_href: buttonHref.data,
        background_image: backgroundImage.data,
      },
    };
  }

  if (type === 'section') {
    const heading = asAnnotatedText(
      node.heading,
      `${id}.heading`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!heading.ok) return heading;

    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;

    return {
      ok: true,
      data: {
        id,
        type,
        heading: heading.data,
        content: content.data,
      },
    };
  }

  if (type === 'feature') {
    const heading = asAnnotatedText(
      node.heading,
      `${id}.heading`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!heading.ok) return heading;

    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;

    const imageSrc = parseSafeHrefProperty(
      node.image_src,
      `${id}.image_src`,
      nodes,
      { allowEmpty: true },
    );
    if (!imageSrc.ok) return imageSrc;

    const imageAlt = asAnnotatedText(
      node.image_alt,
      `${id}.image_alt`,
      nodes,
      [],
    );
    if (!imageAlt.ok) return imageAlt;

    const buttonLabel = asAnnotatedText(
      node.button_label,
      `${id}.button_label`,
      nodes,
      [],
    );
    if (!buttonLabel.ok) return buttonLabel;

    const buttonHref = parseSafeHrefProperty(
      node.button_href,
      `${id}.button_href`,
      nodes,
      { allowEmpty: true },
    );
    if (!buttonHref.ok) return buttonHref;

    return {
      ok: true,
      data: {
        id,
        type,
        heading: heading.data,
        content: content.data,
        image_src: imageSrc.data,
        image_alt: imageAlt.data,
        button_label: buttonLabel.data,
        button_href: buttonHref.data,
      },
    };
  }

  if (type === 'heading') {
    const levelRaw = node.level;
    if (
      !Number.isInteger(levelRaw) ||
      Number(levelRaw) < 1 ||
      Number(levelRaw) > 6
    ) {
      return {
        ok: false,
        message: `Node ${id}.level must be an integer from 1 to 6.`,
      };
    }
    const level = Number(levelRaw);
    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;
    return { ok: true, data: { id, type, level, content: content.data } };
  }

  if (type === 'paragraph') {
    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;
    return { ok: true, data: { id, type, content: content.data } };
  }

  if (type === 'list') {
    const listItems = node.list_items;
    if (
      !Array.isArray(listItems) ||
      !listItems.every((entry) => typeof entry === 'string')
    ) {
      return {
        ok: false,
        message: `Node ${id}.list_items must be a string array.`,
      };
    }
    return { ok: true, data: { id, type, list_items: listItems } };
  }

  if (type === 'list_item') {
    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;
    return { ok: true, data: { id, type, content: content.data } };
  }

  if (type === 'quote') {
    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;

    const citation = asAnnotatedText(
      node.citation,
      `${id}.citation`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!citation.ok) return citation;

    return {
      ok: true,
      data: {
        id,
        type,
        content: content.data,
        citation: citation.data,
      },
    };
  }

  if (type === 'image') {
    const src = parseSafeHrefProperty(node.src, `${id}.src`, nodes, {
      allowEmpty: false,
    });
    if (!src.ok) return src;

    const alt = asAnnotatedText(node.alt, `${id}.alt`, nodes, []);
    if (!alt.ok) return alt;

    const caption = asAnnotatedText(
      node.caption,
      `${id}.caption`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!caption.ok) return caption;

    return {
      ok: true,
      data: {
        id,
        type,
        src: src.data,
        alt: alt.data,
        caption: caption.data,
      },
    };
  }

  if (type === 'divider') {
    return { ok: true, data: { id, type } };
  }

  if (type === 'callout') {
    const title = asAnnotatedText(
      node.title,
      `${id}.title`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!title.ok) return title;

    const content = asAnnotatedText(
      node.content,
      `${id}.content`,
      nodes,
      ANNOTATION_TYPES,
    );
    if (!content.ok) return content;

    const buttonLabel = asAnnotatedText(
      node.button_label,
      `${id}.button_label`,
      nodes,
      [],
    );
    if (!buttonLabel.ok) return buttonLabel;

    const buttonHref = parseSafeHrefProperty(
      node.button_href,
      `${id}.button_href`,
      nodes,
      { allowEmpty: true },
    );
    if (!buttonHref.ok) return buttonHref;

    return {
      ok: true,
      data: {
        id,
        type,
        title: title.data,
        content: content.data,
        button_label: buttonLabel.data,
        button_href: buttonHref.data,
      },
    };
  }

  if (type === 'strong') {
    return { ok: true, data: { id, type } };
  }

  if (type === 'emphasis') {
    return { ok: true, data: { id, type } };
  }

  if (type === 'link') {
    if (typeof node.href !== 'string' || !isSafeSveditHref(node.href)) {
      return {
        ok: false,
        message: `Node ${id}.href must be a safe URL.`,
      };
    }
    return { ok: true, data: { id, type, href: node.href } };
  }

  return {
    ok: false,
    message: `Unsupported node type: ${type}.`,
  };
};

export const validateSveditPageDocument = (
  value: unknown,
):
  | { ok: true; document: SveditPageDocument }
  | { ok: false; message: string } => {
  if (!isRecord(value)) {
    return { ok: false, message: 'Svedit document must be an object.' };
  }

  const documentId = value.document_id;
  if (typeof documentId !== 'string' || !documentId.trim()) {
    return { ok: false, message: 'Svedit document_id is required.' };
  }

  if (!isRecord(value.nodes)) {
    return { ok: false, message: 'Svedit nodes map is required.' };
  }

  const rawNodes = value.nodes;
  const parsedNodes: Record<string, SveditPageNodeRecord> = {};

  for (const [nodeId, nodeValue] of Object.entries(rawNodes)) {
    if (!isRecord(nodeValue)) {
      return {
        ok: false,
        message: `Node ${nodeId} must be an object.`,
      };
    }

    const parsed = parsePageNode(nodeValue, rawNodes);
    if (!parsed.ok) return parsed;

    if (parsed.data.id !== nodeId) {
      return {
        ok: false,
        message: `Node key ${nodeId} does not match node.id ${parsed.data.id}.`,
      };
    }

    parsedNodes[nodeId] = parsed.data;
  }

  const root = parsedNodes[documentId];
  if (!root || root.type !== 'page') {
    return {
      ok: false,
      message: 'document_id must point to a page node.',
    };
  }

  const refCheck = checkNodeReferences(parsedNodes);
  if (!refCheck.ok) return refCheck;

  const graphCheck = ensureReachableAcyclic(documentId, parsedNodes);
  if (!graphCheck.ok) return graphCheck;

  return {
    ok: true,
    document: {
      document_id: documentId,
      nodes: parsedNodes,
    },
  };
};

export const createDefaultAnnotatedText = (text = ''): SveditAnnotatedText => ({
  text,
  annotations: [],
});

export const createDefaultSveditPageDocument = (): SveditPageDocument => {
  const rootId = 'page_root';
  const heroId = 'hero_main';
  const sectionId = 'section_intro';
  const featureId = 'feature_primary';
  const calloutId = 'callout_main';

  return {
    document_id: rootId,
    nodes: {
      [heroId]: {
        id: heroId,
        type: 'hero',
        eyebrow: createDefaultAnnotatedText('Featured story'),
        heading: createDefaultAnnotatedText('Make this page your own.'),
        subheading: createDefaultAnnotatedText(
          'Edit directly on the live layout. Add sections, media, and calls to action without touching code.',
        ),
        button_label: createDefaultAnnotatedText('Explore work'),
        button_href: createDefaultAnnotatedText('/all'),
        background_image: createDefaultAnnotatedText(''),
      },
      [sectionId]: {
        id: sectionId,
        type: 'section',
        heading: createDefaultAnnotatedText('About this page'),
        content: createDefaultAnnotatedText(
          'This section is fully inline editable. Use keyboard shortcuts for emphasis and links, or insert additional section blocks.',
        ),
      },
      [featureId]: {
        id: featureId,
        type: 'feature',
        heading: createDefaultAnnotatedText('Spotlight feature'),
        content: createDefaultAnnotatedText(
          'Pair a visual with supporting copy. Great for testimonials, featured sessions, or service highlights.',
        ),
        image_src: createDefaultAnnotatedText(''),
        image_alt: createDefaultAnnotatedText('Feature image'),
        button_label: createDefaultAnnotatedText('Book now'),
        button_href: createDefaultAnnotatedText('/contact'),
      },
      [calloutId]: {
        id: calloutId,
        type: 'callout',
        title: createDefaultAnnotatedText('Ready to publish?'),
        content: createDefaultAnnotatedText(
          'Use Cmd/Ctrl+S while editing to save changes without leaving the page.',
        ),
        button_label: createDefaultAnnotatedText('Contact us'),
        button_href: createDefaultAnnotatedText('/contact'),
      },
      [rootId]: {
        id: rootId,
        type: 'page',
        body: [heroId, sectionId, featureId, calloutId],
      },
    },
  };
};

export const parseSveditPageDocument = (
  raw: unknown,
):
  | { ok: true; document: SveditPageDocument }
  | { ok: false; message: string } => {
  if (typeof raw === 'string') {
    try {
      return validateSveditPageDocument(JSON.parse(raw));
    } catch {
      return { ok: false, message: 'Svedit JSON is invalid.' };
    }
  }

  return validateSveditPageDocument(raw);
};

export const serializeSveditPageDocument = (document: SveditPageDocument) =>
  JSON.stringify(document);
