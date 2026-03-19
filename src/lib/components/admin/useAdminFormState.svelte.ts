import type {
  AdminFieldErrors,
  AdminFormState,
  AdminSuperFormState,
} from '$lib/types/admin-form';

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const getMessage = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const normalizeFieldErrors = <TField extends string>(
  errors: unknown,
): AdminFieldErrors<TField> => {
  const record = getRecord(errors);
  if (!record) {
    return {};
  }

  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      normalized[key] = value;
      continue;
    }

    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'string'
    ) {
      normalized[key] = value[0];
    }
  }

  return normalized as AdminFieldErrors<TField>;
};

export const useAdminFormState = <
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TField extends string = string,
>(
  getForm: () => unknown,
) => {
  const typedForm = $derived.by(() => {
    const raw =
      (getForm() as AdminFormState<TValues, TField> | null | undefined) ??
      undefined;
    const superForm = getRecord(raw?.form) as
      | AdminSuperFormState<TValues>
      | undefined;
    const message = getMessage(raw?.message) ?? getMessage(superForm?.message);
    const success =
      typeof raw?.success === 'boolean'
        ? raw.success
        : Boolean(message && superForm?.valid === true);
    const legacyFieldErrors = raw?.fieldErrors ?? {};
    const fieldErrors =
      Object.keys(legacyFieldErrors).length > 0
        ? legacyFieldErrors
        : normalizeFieldErrors<TField>(superForm?.errors);
    const values = (raw?.values ??
      (getRecord(superForm?.data) as Partial<TValues> | undefined) ??
      {}) as Partial<TValues>;

    return {
      message,
      success,
      fieldErrors,
      values,
      form: superForm,
    } satisfies AdminFormState<TValues, TField>;
  });
  const message = $derived(typedForm?.message);
  const success = $derived(Boolean(typedForm?.success));
  const fieldErrors = $derived(
    (typedForm?.fieldErrors ?? {}) as AdminFieldErrors<TField>,
  );
  const values = $derived((typedForm?.values ?? {}) as Partial<TValues>);

  return {
    get typedForm() {
      return typedForm;
    },
    get message() {
      return message;
    },
    get success() {
      return success;
    },
    get fieldErrors() {
      return fieldErrors;
    },
    get values() {
      return values;
    },
  };
};
