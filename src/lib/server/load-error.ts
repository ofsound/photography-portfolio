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
