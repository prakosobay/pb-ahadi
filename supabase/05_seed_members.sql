-- =========================================================
-- 05 ISI 10 NAMA — GANTI 'Nama2'..'Nama10' DENGAN NAMA ASLI DULU!
-- Jalankan SEKALI saja (kalau dua kali, nama jadi dobel).
-- =========================================================
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

-- Anggota berhenti? JANGAN delete (riwayat ikut hilang). Cukup:
-- update public.members set aktif = false where nama = '...';
