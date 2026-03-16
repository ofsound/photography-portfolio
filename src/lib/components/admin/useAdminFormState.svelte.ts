import type { AdminFieldErrors, AdminFormState } from '$lib/types/admin-form';

export const useAdminFormState = <
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TField extends string = string,
>(
  getForm: () => unknown,
) => {
  const typedForm = $derived(
    (getForm() as AdminFormState<TValues, TField> | null | undefined) ??
      undefined,
  );
  const fieldErrors = $derived(
    (typedForm?.fieldErrors ?? {}) as AdminFieldErrors<TField>,
  );
  const values = $derived((typedForm?.values ?? {}) as Partial<TValues>);

  return {
    get typedForm() {
      return typedForm;
    },
    get fieldErrors() {
      return fieldErrors;
    },
    get values() {
      return values;
    },
  };
};
