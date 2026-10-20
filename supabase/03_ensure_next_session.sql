-- =========================================================
-- 03 FUNGSI PEMBUAT SESI OTOMATIS (idempoten)
-- =========================================================

create or replace function public.ensure_next_session()
returns public.sessions
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c        public.config%rowtype;
  hari_ini date;
  dow      int;
  selisih  int;
  d_sabtu  date;
  dl       timestamptz;
  s        public.sessions%rowtype;
begin
  select * into c from public.config where id = 1;

  -- Tanggal hari ini menurut WIB, bukan UTC
  hari_ini := (now() at time zone 'Asia/Jakarta')::date;
  dow      := extract(dow from hari_ini);   -- 0=Minggu ... 6=Sabtu

  -- Sabtu berikutnya yang benar-benar di masa depan
  selisih := (6 - dow + 7) % 7;
  if selisih = 0 then selisih := 7; end if;
  d_sabtu := hari_ini + selisih;

  -- Deadline = Kamis 18:00 WIB sebelum Sabtu tsb (Sabtu dikurangi 2 hari)
  dl := ((d_sabtu - 2) + time '18:00') at time zone 'Asia/Jakarta';

  insert into public.sessions
    (tanggal, deadline, harga_per_jam, durasi_jam, min_pemain, pembulatan)
  values
    (d_sabtu, dl, c.harga_per_jam, c.durasi_jam, c.min_pemain, c.pembulatan)
  on conflict (tanggal) do nothing;

  select * into s from public.sessions where tanggal = d_sabtu;
  return s;
end;
$fn$;

revoke execute on function public.ensure_next_session() from public;
grant  execute on function public.ensure_next_session() to anon, authenticated;
