# PLAN 1 — Setup Supabase (Database, RLS, API)

Dikerjakan manual lewat dashboard Supabase. Perkiraan waktu: 30–45 menit.
Selesaikan plan ini **sebelum** mulai `PLAN-WEB.md`.

---

## 1. Buat project

1. Buka https://supabase.com → **New Project**
2. Name: `pb-ahadi`
3. Region: **Southeast Asia (Singapore)** — paling dekat dengan Indonesia
4. Database Password: simpan di password manager
5. Tunggu provisioning selesai (~2 menit)

Setelah jadi, catat dari **Settings → API**:

| Item | Dipakai di | Boleh publik? |
|---|---|---|
| Project URL | frontend + cron | ya |
| `anon` / `public` key | frontend + cron | ya (dijaga RLS) |
| `service_role` key | **tidak dipakai sama sekali** | TIDAK PERNAH |

> `anon key` pasti terbaca di source code browser. Itu memang desainnya Supabase.
> Yang menjaga data adalah RLS di langkah 3, bukan kerahasiaan key.

---

## 2. Skema tabel

Buka **SQL Editor → New query**, jalankan seluruh blok ini sekaligus.

```sql
-- =========================================================
-- 1. MEMBERS — daftar tetap 10 orang
-- =========================================================
create table public.members (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,
  urutan      int  not null default 0,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =========================================================
-- 2. CONFIG — satu baris saja, default untuk sesi baru
-- =========================================================
create table public.config (
  id            int primary key default 1,
  harga_per_jam int not null default 90000,
  durasi_jam    numeric(3,1) not null default 2,
  min_pemain    int not null default 7,
  pembulatan    int not null default 1000,
  constraint config_single_row check (id = 1)
);

insert into public.config (id) values (1);

-- =========================================================
-- 3. SESSIONS — satu baris per Sabtu
--    Harga di-SNAPSHOT ke dalam baris, supaya riwayat lama
--    tidak ikut berubah kalau tarif sewa naik.
-- =========================================================
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  tanggal         date not null unique,
  deadline        timestamptz not null,
  harga_per_jam   int not null,
  durasi_jam      numeric(3,1) not null,
  min_pemain      int not null,
  pembulatan      int not null default 1000,
  status_override text check (status_override in ('jadi','batal')),
  catatan         text,
  created_at      timestamptz not null default now()
);

-- =========================================================
-- 4. ATTENDANCES — jawaban per orang per sesi
--    Tidak ada status "belum jawab": belum jawab = baris belum ada.
-- =========================================================
create table public.attendances (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  ikut       boolean not null,
  updated_at timestamptz not null default now(),
  unique (session_id, member_id)
);

create index attendances_session_idx on public.attendances (session_id);

-- Auto-update kolom updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger attendances_touch
  before update on public.attendances
  for each row execute function public.touch_updated_at();
```

---

## 3. Row Level Security

Jalankan setelah langkah 2. **Jangan dilewati** — tanpa ini siapa pun bisa
menghapus seluruh data kamu dari DevTools browser.

```sql
-- Aktifkan RLS di semua tabel
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

-- ---------- Sabuk pengaman tambahan ----------
-- Tidak ada policy DELETE di mana pun = DELETE selalu ditolak.
-- Perintah di bawah mencabut grant bawaan Supabase sebagai lapis kedua.
revoke insert, update, delete on public.members     from anon, authenticated;
revoke insert, update, delete on public.sessions    from anon, authenticated;
revoke insert, update, delete on public.config      from anon, authenticated;
revoke delete                  on public.attendances from anon, authenticated;
```

### Kenapa deadline dicek di sini, bukan di frontend

Men-disable tombol di web hanya sopan santun antarmuka. Siapa pun yang membuka
DevTools bisa memanggil API langsung. Policy di atas membuat **database** yang
menolak input setelah Kamis 18:00 WIB, tidak peduli dari mana permintaannya datang.

---

## 4. Fungsi pembuat sesi otomatis

Ini menggantikan cron job terpisah. Fungsinya **idempoten** (aman dipanggil
berkali-kali) dan akan dipanggil frontend setiap kali web dibuka — jadi sesi
Sabtu berikutnya terbuat sendiri tanpa kamu sentuh.

```sql
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
```

**Kenapa aman di-grant ke publik:** fungsinya tanpa parameter dan idempoten.
Dipanggil 1000 kali pun hasilnya tetap satu baris sesi yang sama. Tidak ada
input dari luar yang bisa dimanipulasi.

**Verifikasi zona waktu** — jalankan ini dan pastikan hasilnya masuk akal:

```sql
select tanggal,
       deadline,
       deadline at time zone 'Asia/Jakarta' as deadline_wib
from public.ensure_next_session();
```

Kolom `deadline_wib` **harus** menunjukkan hari **Kamis pukul 18:00:00**.
Kalau tidak, hentikan dan perbaiki sebelum lanjut — ini bug yang paling mahal
kalau baru ketahuan setelah dipakai orang.

---

## 5. Aktifkan Realtime

Supaya saat ada yang menekan "Ikut", layar orang lain ikut berubah tanpa refresh.

```sql
alter publication supabase_realtime add table public.attendances;
```

Cek juga di **Database → Replication**, pastikan tabel `attendances` tercentang.

---

## 6. Isi 10 nama

Ganti nama di bawah dengan nama teman kantor kamu. `urutan` mengatur posisi
tampil di daftar.

```sql
insert into public.members (nama, urutan) values
  ('Ari',    1),
  ('Nama2',  2),
  ('Nama3',  3),
  ('Nama4',  4),
  ('Nama5',  5),
  ('Nama6',  6),
  ('Nama7',  7),
  ('Nama8',  8),
  ('Nama9',  9),
  ('Nama10', 10);
```

Kalau nanti ada yang resign atau berhenti ikut, **jangan dihapus** — cukup:

```sql
update public.members set aktif = false where nama = '...';
```

Menghapus baris akan ikut menghilangkan seluruh riwayat kehadirannya.

---

## 7. Uji keamanan (wajib)

Jalankan di SQL Editor.

```sql
-- Simulasikan diri sebagai pengunjung web biasa
set local role anon;

select count(*) from public.members;       -- OK, ada angkanya
delete from public.sessions;               -- HARUS ERROR: permission denied
update public.config set harga_per_jam=1;  -- HARUS ERROR: permission denied

reset role;
```

Kalau ada satu saja perintah berbahaya yang **berhasil**, RLS belum benar.
Ulangi langkah 3.

Uji penguncian deadline:

```sql
-- Geser deadline ke masa lalu untuk pengujian
update public.sessions set deadline = now() - interval '1 hour'
where tanggal = (select max(tanggal) from public.sessions);

-- Coba insert sebagai anon → harus ditolak
-- (lakukan lewat web, atau: set local role anon; insert into ... )

-- KEMBALIKAN setelah selesai menguji:
-- update public.sessions set deadline = ... where tanggal = ...;
```

---

## 8. Kontrak API untuk frontend

Dipakai oleh `PLAN-WEB.md`. **Jangan ubah nama tabel/kolom/fungsi tanpa
memperbarui file itu juga.**

| Operasi | Pemanggilan `supabase-js` |
|---|---|
| Pastikan sesi ada | `supabase.rpc('ensure_next_session')` |
| Anggota aktif | `.from('members').select('*').eq('aktif', true).order('urutan')` |
| Konfigurasi | `.from('config').select('*').single()` |
| Sesi terdekat | `.from('sessions').select('*').order('tanggal', {ascending:false}).limit(1).single()` |
| Riwayat | `.from('sessions').select('*').order('tanggal', {ascending:false}).limit(20)` |
| Kehadiran | `.from('attendances').select('*').eq('session_id', id)` |
| Simpan jawaban | `.from('attendances').upsert({session_id, member_id, ikut}, {onConflict:'session_id,member_id'})` |
| Realtime | channel `postgres_changes`, event `*`, schema `public`, table `attendances` |

**Error saat deadline lewat:** PostgREST mengembalikan kode `42501`
(*new row violates row-level security policy*). Frontend wajib menangkap ini
dan menampilkan "Input sudah ditutup", bukan error mentah.

---

## 9. Keep-alive (opsional, kerjakan terakhir)

Project Supabase free tier tertidur setelah ~1 minggu tanpa aktivitas. Kalau
badminton sempat libur 2 minggu, web bisa error saat dibuka.

Buat `.github/workflows/keepalive.yml`:

```yaml
name: keep-alive
on:
  schedule:
    - cron: '0 1 */2 * *'   # tiap 2 hari, 08:00 WIB
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -sS -X POST \
            "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/ensure_next_session" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}' --fail
```

Satu mekanisme, dua manfaat: project tidak tertidur, dan sesi Sabtu berikutnya
tetap terbuat meski tidak ada yang membuka web.

---

## Checklist selesai

- [ ] Project Supabase dibuat, region Singapore
- [ ] 4 tabel terbuat tanpa error
- [ ] RLS aktif di keempat tabel
- [ ] Uji keamanan langkah 7 lolos (DELETE & UPDATE ditolak)
- [ ] `ensure_next_session()` menghasilkan deadline **Kamis 18:00 WIB**
- [ ] Realtime aktif untuk `attendances`
- [ ] 10 nama terisi
- [ ] Project URL dan `anon key` dicatat untuk `PLAN-WEB.md`
