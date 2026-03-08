update pages
set deleted_at = null
where kind <> 'home'
  and status = 'archived';
