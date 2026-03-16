export type AdminFieldErrors<TField extends string = string> = Partial<
  Record<TField, string | undefined>
>;

export type AdminFormState<
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TField extends string = string,
> = {
  message?: string;
  success?: boolean;
  fieldErrors?: AdminFieldErrors<TField>;
  values?: TValues;
};
