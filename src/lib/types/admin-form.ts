export type AdminFieldErrors<TField extends string = string> = Partial<
  Record<TField, string | undefined>
>;

export type AdminSuperFormState<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> = {
  message?: unknown;
  valid?: boolean;
  errors?: Record<string, unknown>;
  data?: Partial<TValues>;
};

export type AdminFormState<
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TField extends string = string,
> = {
  message?: string;
  success?: boolean;
  fieldErrors?: AdminFieldErrors<TField>;
  values?: Partial<TValues>;
  form?: AdminSuperFormState<TValues>;
};
