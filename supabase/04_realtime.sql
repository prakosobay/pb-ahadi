-- =========================================================
-- 04 REALTIME — aman dijalankan berulang
-- =========================================================
do $r$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendances'
  ) then
    alter publication supabase_realtime add table public.attendances;
  end if;
end
$r$;
