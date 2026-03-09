export type FormFieldState = {
  required: boolean;
  invalid: boolean;
  describedBy?: string;
};

export type FormFieldContextResolver = () => FormFieldState;

export const formFieldContextKey = Symbol('form-field-context');
