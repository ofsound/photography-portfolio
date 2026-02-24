import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(200, Math.max(20, Number.parseInt(url.searchParams.get('pageSize') ?? '80', 10) || 80));

  const { data: logs } = await locals.supabase
    .from('audit_log')
    .select('id, created_at, action, entity_type, entity_pk, actor_user_id, changes')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  return {
    logs: logs ?? [],
    page,
    pageSize
  };
};
