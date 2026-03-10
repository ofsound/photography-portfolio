import process from 'node:process';

import tailwindCoreThemeCss from 'tailwindcss/theme.css?raw';
import tailwindThemeCss from '$lib/styles/tailwind-theme.css?raw';

const CLASS_ATTR_PATTERN = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const TAILWIND_LICENSE_BANNER_PATTERN = /^\/\*![\s\S]*?\*\/\s*/;
const CMS_TAILWIND_SOURCE = `${tailwindCoreThemeCss}
@tailwind utilities;
${tailwindThemeCss}
`;

type TailwindCompile = (typeof import('tailwindcss'))['compile'];
type CmsTailwindCompiler = Awaited<ReturnType<TailwindCompile>>;

let compilerPromise: Promise<CmsTailwindCompiler> | null = null;

const stripTailwindLicenseBanner = (css: string) => {
  return css.replace(TAILWIND_LICENSE_BANNER_PATTERN, '').trim();
};

const getCompiler = async () => {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const { compile } = await import('tailwindcss');
      return compile(CMS_TAILWIND_SOURCE, { base: process.cwd() });
    })().catch((error: unknown) => {
      compilerPromise = null;
      throw error;
    });
  }
  return compilerPromise;
};

export class CmsTailwindCompileError extends Error {
  readonly code = 'CMS_TAILWIND_COMPILE_ERROR';
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'CmsTailwindCompileError';
    this.cause = cause;
  }
}

const extractTailwindClassCandidates = (html: string) => {
  const candidates: string[] = [];
  const seen: Record<string, true> = {};

  CLASS_ATTR_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = CLASS_ATTR_PATTERN.exec(html);
  while (match) {
    const classValue = (match[1] ?? match[2] ?? '').trim();
    if (classValue) {
      for (const token of classValue.split(/\s+/g)) {
        if (token && !seen[token]) {
          seen[token] = true;
          candidates.push(token);
        }
      }
    }
    match = CLASS_ATTR_PATTERN.exec(html);
  }

  return candidates.sort();
};

export const compileCmsTailwindCss = async (sanitizedHtml: string) => {
  const candidates = extractTailwindClassCandidates(sanitizedHtml);
  if (candidates.length === 0) return '';

  try {
    const compiler = await getCompiler();
    const css = compiler.build(candidates);
    return stripTailwindLicenseBanner(css);
  } catch (error: unknown) {
    throw new CmsTailwindCompileError(
      'Failed to compile Tailwind CSS for CMS content.',
      error,
    );
  }
};
