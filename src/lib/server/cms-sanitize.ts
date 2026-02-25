import sanitizeHtml from 'sanitize-html';
import { createCmsScopeKey } from '$lib/utils/cms-scope';

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
  h1: ['class'],
  h2: ['class'],
  h3: ['class'],
  h4: ['class'],
  h5: ['class'],
  h6: ['class'],
  p: ['class'],
  a: ['href', 'target', 'rel', 'title', 'class'],
  ul: ['class'],
  ol: ['class'],
  li: ['class'],
  blockquote: ['class'],
  hr: ['class'],
  span: ['class'],
  div: ['class'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'class'],
  figure: ['class'],
  figcaption: ['class']
};

const safeAnchorSchemes = new Set(['http:', 'https:', 'mailto:']);
const safeImageSchemes = new Set(['http:', 'https:']);
const unsafeCssValuePattern = /(expression\s*\(|javascript:|vbscript:|data:\s*text\/html|@import)/i;
const unsafeCssPropertyPattern = /^(behavior|-moz-binding)$/i;

const splitSelectors = (selectors: string) => {
  const parts: string[] = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;
  let quote: '"' | "'" | null = null;

  for (const char of selectors) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') depthParen += 1;
    if (char === ')') depthParen = Math.max(0, depthParen - 1);
    if (char === '[') depthBracket += 1;
    if (char === ']') depthBracket = Math.max(0, depthBracket - 1);

    if (char === ',' && depthParen === 0 && depthBracket === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const isSafeUrl = (rawValue: string, allowedSchemes: Set<string>, allowMailto = false) => {
  const value = rawValue.trim();
  if (!value) return false;
  if (value.startsWith('#')) return true;
  if (value.startsWith('/')) return !value.startsWith('//');
  if (value.startsWith('./') || value.startsWith('../')) return true;

  const schemeMatch = value.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) return true;
  const scheme = `${schemeMatch[1].toLowerCase()}:`;
  if (allowMailto && scheme === 'mailto:') return true;
  return allowedSchemes.has(scheme);
};

const sanitizeAnchorAttrs = (attrs: Record<string, string>) => {
  const sanitized: Record<string, string> = {};
  const href = attrs.href && isSafeUrl(attrs.href, safeAnchorSchemes, true) ? attrs.href : null;

  if (href) {
    sanitized.href = href;
  }
  if (attrs.title) {
    sanitized.title = attrs.title.slice(0, 300);
  }
  if (attrs.class) {
    sanitized.class = attrs.class;
  }

  if (attrs.target === '_blank' && href) {
    sanitized.target = '_blank';
    sanitized.rel = 'noopener noreferrer nofollow';
  } else if (attrs.rel && href) {
    sanitized.rel = attrs.rel;
  }

  return sanitized;
};

const asPositiveIntString = (raw: string | undefined, max: number) => {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return String(Math.min(parsed, max));
};

const sanitizeImageAttrs = (attrs: Record<string, string>) => {
  const sanitized: Record<string, string> = {};
  const src = attrs.src && isSafeUrl(attrs.src, safeImageSchemes) ? attrs.src : null;
  if (!src) return sanitized;

  sanitized.src = src;
  sanitized.alt = (attrs.alt ?? '').slice(0, 500);
  if (attrs.title) sanitized.title = attrs.title.slice(0, 300);
  if (attrs.class) sanitized.class = attrs.class;

  const width = asPositiveIntString(attrs.width, 12000);
  const height = asPositiveIntString(attrs.height, 12000);
  if (width) sanitized.width = width;
  if (height) sanitized.height = height;

  if (attrs.loading === 'lazy' || attrs.loading === 'eager') {
    sanitized.loading = attrs.loading;
  }
  if (attrs.decoding === 'sync' || attrs.decoding === 'async' || attrs.decoding === 'auto') {
    sanitized.decoding = attrs.decoding;
  }

  return sanitized;
};

const findMatchingBrace = (input: string, openBraceIndex: number) => {
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let i = openBraceIndex; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      if (char === quote && input[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
};

const sanitizeCssDeclarationBlock = (input: string) => {
  const declarations = input
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const cleaned: string[] = [];

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex <= 0) continue;

    const property = declaration.slice(0, colonIndex).trim();
    let value = declaration.slice(colonIndex + 1).trim();

    if (!property || !value) continue;
    if (unsafeCssPropertyPattern.test(property)) continue;
    if (unsafeCssValuePattern.test(value)) continue;

    let unsafeUrl = false;
    value = value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_, __, url: string) => {
      if (!isSafeUrl(url, safeImageSchemes)) {
        unsafeUrl = true;
      }
      return `url("${url}")`;
    });

    if (unsafeUrl) continue;
    cleaned.push(`${property}: ${value}`);
  }

  return cleaned.join('; ');
};

const scopeSelectors = (selectors: string, scopeSelector: string) => {
  return splitSelectors(selectors)
    .map((selector) => {
      if (!selector) return scopeSelector;
      if (selector.startsWith(scopeSelector)) return selector;
      if (/^(:root|html|body)\b/i.test(selector)) return scopeSelector;
      return `${scopeSelector} ${selector}`;
    })
    .join(', ');
};

const scopeAndSanitizeCss = (css: string, scopeSelector: string, shouldScopeSelectors = true): string => {
  const input = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let output = '';
  let index = 0;

  while (index < input.length) {
    const openBrace = input.indexOf('{', index);
    if (openBrace === -1) break;

    const prelude = input.slice(index, openBrace).trim();
    const closeBrace = findMatchingBrace(input, openBrace);
    if (!prelude || closeBrace === -1) break;

    const body = input.slice(openBrace + 1, closeBrace);
    index = closeBrace + 1;

    if (prelude.startsWith('@')) {
      const atName = prelude.slice(1).split(/[\s(]/)[0]?.toLowerCase() ?? '';
      if (atName === 'import' || atName === 'charset' || atName === 'namespace' || atName === 'font-face') {
        continue;
      }
      if (atName.endsWith('keyframes')) {
        output += `${prelude}{${scopeAndSanitizeCss(body, scopeSelector, false)}}`;
        continue;
      }
      output += `${prelude}{${scopeAndSanitizeCss(body, scopeSelector, shouldScopeSelectors)}}`;
      continue;
    }

    const scopedSelectors = shouldScopeSelectors ? scopeSelectors(prelude, scopeSelector) : prelude;
    const sanitizedDeclarations = sanitizeCssDeclarationBlock(body);
    if (!sanitizedDeclarations) continue;
    output += `${scopedSelectors}{${sanitizedDeclarations}}`;
  }

  return output;
};

export const sanitizeCmsHtml = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
      img: ['http', 'https']
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: sanitizeAnchorAttrs(attribs)
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: sanitizeImageAttrs(attribs)
      })
    },
    exclusiveFilter: (frame) => {
      if (frame.tag !== 'img') return false;
      return !frame.attribs.src;
    }
  });
};

export const sanitizeCmsCss = (css: string, pageSlug?: string | null): string => {
  if (!css.trim()) return '';
  const scopeSelector = `[data-cms-scope="${createCmsScopeKey(pageSlug)}"]`;
  return scopeAndSanitizeCss(css, scopeSelector);
};
