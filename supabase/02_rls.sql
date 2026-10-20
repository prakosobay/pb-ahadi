-- =========================================================
-- 02 ROW LEVEL SECURITY — jalankan setelah 01. JANGAN dilewati.
-- =========================================================

alter table public.members     enable row level security;
alter table public.config      enable row level security;
alter table public.sessions    enable row level security;
alter table public.attendances enable row level security;

-- ---------- BACA: semua orang boleh ----------
create policy "members_read" on public.members
  for select to anon, authenticated using (true);

create policy "config_read" on public.config
  for select to anon, authenticated using (true);

create policy "sessions_read" on public.sessions
  for select to anon, authenticated using (true);

create policy "attendances_read" on public.attendances
  for select to anon, authenticated using (true);

-- ---------- TULIS: hanya attendances, hanya sebelum deadline ----------
create policy "attendances_insert_before_deadline" on public.attendances
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and now() < s.deadline
    )
    and exists (
      select 1 from public.members m
      where m.id = member_id and m.aktif
    )
  );

create policy "attendances_update_before_deadline" on public.attendances
  for update to anon, authenticated
  using (
    exists (select 1 from public.sessions s
            where s.id = session_id and now() < s.deadline)
  )
  with check (
    exists (select 1 from public.sessions s
            where s.id = session_id and now() < s.deadline)
  );

-- ---------- GRANT: eksplisit, jangan bergantung pada default Supabase ----------
-- Tidak ada policy DELETE di mana pun = DELETE selalu ditolak (lapis 1).
-- Grant di bawah adalah lapis 2: yang tidak di-grant, tidak bisa dilakukan.
revoke all on public.members     from anon, authenticated;
revoke all on public.sessions    from anon, authenticated;
revoke all on public.config      from anon, authenticated;
revoke all on public.attendances from anon, authenticated;

grant select on public.members     to anon, authenticated;
grant select on public.sessions    to anon, authenticated;
grant select on public.config      to anon, authenticated;
grant select, insert, update on public.attendances to anon, authenticated;
