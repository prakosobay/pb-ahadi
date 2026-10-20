-- =========================================================
-- 99 UJI OTOMATIS — jalankan SEKALIGUS di SQL Editor (sebagai postgres).
-- Tidak meninggalkan data: semua uji dibatalkan (rollback) di akhir.
-- Hasil: tabel. Kolom `lolos` harus true SEMUA.
-- =========================================================

-- Menjalankan satu perintah sebagai pengunjung web (role anon).
-- Mengembalikan 'OK:<jumlah baris>' atau SQLSTATE error-nya (mis. 42501).
create function pg_temp.coba_anon(q text) returns text
language plpgsql as $f$
declare rc bigint;
begin
  set local role anon;
  begin
    execute q;
    get diagnostics rc = row_count;
    reset role;
    return 'OK:' || rc;
  exception when others then
    reset role;
    return sqlstate;
  end;
end
$f$;

create function pg_temp.catat(res jsonb, nama text, hasil text, harapan text) returns jsonb
language sql as $f$
  select res || jsonb_build_array(jsonb_build_object(
    'pengujian', nama, 'hasil', hasil, 'harapan', harapan,
    'lolos', hasil = harapan));
$f$;

create function pg_temp.run_tests()
returns table (nomor int, pengujian text, harapan text, hasil text, lolos boolean)
language plpgsql as $t$
declare
  res   jsonb := '[]';
  s     public.sessions;
  s2    public.sessions;
  m1    uuid;
  m2    uuid;
  moff  uuid;
  dl_wib timestamp;
  v     text;
begin
  begin  -- subtransaction: dibatalkan paksa di akhir

    -- ---- setup (sebagai owner) ----
    insert into public.members (nama, urutan) values ('__uji_1__', 990) returning id into m1;
    insert into public.members (nama, urutan) values ('__uji_2__', 991) returning id into m2;
    insert into public.members (nama, urutan, aktif) values ('__uji_off__', 992, false) returning id into moff;

    s  := public.ensure_next_session();
    s2 := public.ensure_next_session();
    dl_wib := s.deadline at time zone 'Asia/Jakarta';

    -- ---- fungsi ensure_next_session ----
    res := pg_temp.catat(res, 'idempoten: dua panggilan = sesi sama', (s.id = s2.id)::text, 'true');
    res := pg_temp.catat(res, 'tanggal sesi adalah hari Sabtu', extract(isodow from s.tanggal)::text, '6');
    res := pg_temp.catat(res, 'tanggal sesi di masa depan (WIB)',
      (s.tanggal > (now() at time zone 'Asia/Jakarta')::date)::text, 'true');
    res := pg_temp.catat(res, 'deadline jatuh pada hari Kamis (WIB)', extract(isodow from dl_wib)::text, '4');
    res := pg_temp.catat(res, 'deadline pukul 18:00 (WIB)', dl_wib::time::text, '18:00:00');
    res := pg_temp.catat(res, 'deadline 2 hari sebelum Sabtu', (s.tanggal - dl_wib::date)::text, '2');

    -- siapkan: deadline masih terbuka
    update public.sessions set deadline = now() + interval '1 hour' where id = s.id;

    -- ---- keamanan: yang HARUS ditolak ----
    res := pg_temp.catat(res, 'anon DELETE sessions', pg_temp.coba_anon('delete from public.sessions'), '42501');
    res := pg_temp.catat(res, 'anon UPDATE sessions', pg_temp.coba_anon('update public.sessions set catatan = ''x'''), '42501');
    res := pg_temp.catat(res, 'anon INSERT sessions',
      pg_temp.coba_anon('insert into public.sessions (tanggal, deadline, harga_per_jam, durasi_jam, min_pemain) values (current_date + 900, now(), 1, 1, 1)'), '42501');
    res := pg_temp.catat(res, 'anon UPDATE config', pg_temp.coba_anon('update public.config set harga_per_jam = 1'), '42501');
    res := pg_temp.catat(res, 'anon DELETE config', pg_temp.coba_anon('delete from public.config'), '42501');
    res := pg_temp.catat(res, 'anon INSERT members', pg_temp.coba_anon('insert into public.members (nama) values (''x'')'), '42501');
    res := pg_temp.catat(res, 'anon UPDATE members', pg_temp.coba_anon('update public.members set aktif = false'), '42501');
    res := pg_temp.catat(res, 'anon DELETE members', pg_temp.coba_anon('delete from public.members'), '42501');
    res := pg_temp.catat(res, 'anon DELETE attendances', pg_temp.coba_anon('delete from public.attendances'), '42501');

    -- ---- fungsional: yang HARUS boleh ----
    res := pg_temp.catat(res, 'anon SELECT members', pg_temp.coba_anon('select count(*) from public.members'), 'OK:1');
    res := pg_temp.catat(res, 'anon SELECT config', pg_temp.coba_anon('select * from public.config'), 'OK:1');
    res := pg_temp.catat(res, 'anon panggil ensure_next_session', pg_temp.coba_anon('select public.ensure_next_session()'), 'OK:1');
    res := pg_temp.catat(res, 'anon INSERT jawaban sebelum deadline',
      pg_temp.coba_anon(format('insert into public.attendances (session_id, member_id, ikut) values (%L, %L, true)', s.id, m1)), 'OK:1');
    res := pg_temp.catat(res, 'anon UPSERT (ubah jawaban) sebelum deadline',
      pg_temp.coba_anon(format('insert into public.attendances (session_id, member_id, ikut) values (%L, %L, false) on conflict (session_id, member_id) do update set ikut = excluded.ikut', s.id, m1)), 'OK:1');
    select ikut::text into v from public.attendances where session_id = s.id and member_id = m1;
    res := pg_temp.catat(res, 'jawaban benar-benar berubah jadi false', v, 'false');
    res := pg_temp.catat(res, 'anon INSERT untuk anggota nonaktif',
      pg_temp.coba_anon(format('insert into public.attendances (session_id, member_id, ikut) values (%L, %L, true)', s.id, moff)), '42501');

    -- ---- penguncian deadline: geser ke masa lalu ----
    update public.sessions set deadline = now() - interval '1 hour' where id = s.id;

    res := pg_temp.catat(res, 'SETELAH deadline: anon INSERT ditolak',
      pg_temp.coba_anon(format('insert into public.attendances (session_id, member_id, ikut) values (%L, %L, true)', s.id, m2)), '42501');
    res := pg_temp.catat(res, 'SETELAH deadline: anon UPDATE tidak mengubah baris',
      pg_temp.coba_anon(format('update public.attendances set ikut = true where session_id = %L and member_id = %L', s.id, m1)), 'OK:0');
    res := pg_temp.catat(res, 'SETELAH deadline: anon UPSERT ditolak',
      pg_temp.coba_anon(format('insert into public.attendances (session_id, member_id, ikut) values (%L, %L, true) on conflict (session_id, member_id) do update set ikut = excluded.ikut', s.id, m1)), '42501');
    select ikut::text into v from public.attendances where session_id = s.id and member_id = m1;
    res := pg_temp.catat(res, 'SETELAH deadline: jawaban tetap false', v, 'false');
    res := pg_temp.catat(res, 'SETELAH deadline: anon masih bisa SELECT',
      pg_temp.coba_anon(format('select * from public.attendances where session_id = %L', s.id)), 'OK:1');

    raise exception using errcode = 'P0001', message = '__rollback_uji__';
  exception when sqlstate 'P0001' then
    null;  -- sengaja: batalkan semua data uji, hasil (res) tetap terbawa
  end;

  return query
    select (row_number() over ())::int,
           x->>'pengujian', x->>'harapan', x->>'hasil', (x->>'lolos')::boolean
    from jsonb_array_elements(res) x;
end
$t$;

select * from pg_temp.run_tests();
