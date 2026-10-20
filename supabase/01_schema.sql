-- =========================================================
-- 01 SKEMA — jalankan pertama, sekali saja, di project baru
-- =========================================================

-- 1. MEMBERS — daftar tetap 10 orang
create table public.members (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,
  urutan      int  not null default 0,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2. CONFIG — satu baris saja, default untuk sesi baru
create table public.config (
  id            int primary key default 1,
  harga_per_jam int not null default 90000,
  durasi_jam    numeric(3,1) not null default 2,
  min_pemain    int not null default 7,
  pembulatan    int not null default 1000,
  constraint config_single_row check (id = 1)
);

insert into public.config (id) values (1);

-- 3. SESSIONS — satu baris per Sabtu
--    Harga di-SNAPSHOT ke dalam baris, supaya riwayat lama
--    tidak ikut berubah kalau tarif sewa naik.
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

-- 4. ATTENDANCES — jawaban per orang per sesi
--    Tidak ada status "belum jawab": belum jawab = baris belum ada.
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
