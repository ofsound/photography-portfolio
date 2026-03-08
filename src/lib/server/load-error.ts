import { error } from '@sveltejs/kit';

type LoaderErrorContext = {
  route: string;
  operation: string;
  details?: Record<string, boolean | number | string | null | undefined>;
};

const normalizeCause = (cause: unknown) => {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
    };
  }

  if (cause && typeof cause === 'object') {
    const candidate = cause as Record<string, unknown>;
    return {
      message:
        typeof candidate.message === 'string' ? candidate.message : undefined,
      details:
        typeof candidate.details === 'string' ? candidate.details : undefined,
      hint: typeof candidate.hint === 'string' ? candidate.hint : undefined,
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      raw: candidate,
    };
  }

  return { value: String(cause) };
};

export const throwLoaderError = (
  context: LoaderErrorContext,
  cause: unknown,
): never => {
  console.error('[loader-error]', {
    route: context.route,
    operation: context.operation,
    details: context.details ?? null,
    cause: normalizeCause(cause),
  });

  throw error(500, 'Failed to load page data.');
};
