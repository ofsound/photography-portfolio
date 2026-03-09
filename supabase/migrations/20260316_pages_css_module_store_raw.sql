begin;

update public.pages
set css_module = regexp_replace(
  regexp_replace(
    css_module,
    E'(^|[,{])[[:space:]]*(\\[data-cms-scope[[:space:]]*=[[:space:]]*"[^"]*"\\][[:space:]]+)+',
    E'\\1',
    'g'
  ),
  E'(^|[,{])[[:space:]]*\\[data-cms-scope[[:space:]]*=[[:space:]]*"[^"]*"\\][[:space:]]*(\\{)',
  E'\\1:root\\2',
  'g'
)
where css_module is not null
  and css_module ~ E'\\[data-cms-scope[[:space:]]*=';

commit;
