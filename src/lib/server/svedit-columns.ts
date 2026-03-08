const MIGRATION_NOTICE =
  'Svedit columns are missing in the database. Apply migration 20260311_pages_svedit_editor_mode.sql.';

export const getSveditMigrationNotice = () => MIGRATION_NOTICE;

export const isMissingSveditColumnsError = (
  error:
    | { message?: string; details?: string; hint?: string }
    | null
    | undefined,
) => {
  if (!error) return false;

  const text =
    `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();

  return (
    text.includes('editor_mode') ||
    text.includes('svedit_doc') ||
    text.includes('svedit_schema_version') ||
    text.includes('page_editor_mode')
  );
};
