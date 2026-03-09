import { fail } from '@sveltejs/kit';

export type FieldErrors = Record<string, string | undefined>;
export type FormValues = Record<string, string>;

type FormFailurePayload = {
  message: string;
  success?: false;
  fieldErrors?: FieldErrors;
  values?: FormValues;
};

export const failForm = (
  message: string,
  {
    fieldErrors,
    values,
    status = 400,
  }: {
    fieldErrors?: FieldErrors;
    values?: FormValues;
    status?: number;
  } = {},
) =>
  fail(status, {
    success: false,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(values ? { values } : {}),
  } satisfies FormFailurePayload);
