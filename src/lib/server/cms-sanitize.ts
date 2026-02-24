import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'a',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'br',
  'span',
  'div',
  'img',
  'figure',
  'figcaption'
];

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  '*': ['class']
};

export const sanitizeCmsHtml = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https']
    },
    disallowedTagsMode: 'discard'
  });
};

export const sanitizeCmsCss = (css: string): string => {
  const withoutImports = css.replace(/@import[^;]+;/gi, '');
  const withoutJsUrls = withoutImports.replace(/url\((\s*)['"]?javascript:[^)]*\)/gi, 'url()');
  return withoutJsUrls;
};
