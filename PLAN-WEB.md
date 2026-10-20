# PLAN 2 — Coding Web (React + Vite + Tailwind)

> **Untuk agent/sesi yang mengerjakan file ini.**
> Dokumen ini self-contained. Kerjakan persis seperti tertulis.
> Prasyarat: `PLAN-SUPABASE.md` sudah selesai dieksekusi (tabel, RLS, dan
> fungsi `ensure_next_session()` sudah ada di Supabase).
> Semua teks antarmuka berbahasa **Indonesia**.

---

## 0. Ringkasan produk

Web internal untuk ~10 teman kantor, dipakai untuk konfirmasi ikut badminton
**setiap Sabtu pagi**.

| Aturan bisnis | Nilai |
|---|---|
| Hari main | Sabtu |
| Minimal pemain | 7 (dari `sessions.min_pemain`) |
| Deadline konfirmasi | Kamis 18:00 WIB (dari `sessions.deadline`) |
| Biaya | `harga_per_jam × durasi_jam`, dibagi rata **hanya ke yang hadir** |
| Pembulatan | naik ke kelipatan `sessions.pembulatan` (default 1.000) |
| Perangkat utama | **HP** — mobile first, wajib |

**Tidak ada sistem login.** Pengguna memilih namanya sekali dari daftar,
disimpan di `localStorage`. Ini keputusan desain yang disengaja: friction login
akan membunuh adopsi di grup sekecil ini. Jangan tambahkan Supabase Auth.

---

## 1. Batasan keras (JANGAN dilanggar)

| Jangan | Alasan |
|---|---|
| Jangan pakai Supabase Auth / login / password | Lihat di atas |
| Jangan pakai React Router | Cuma 2 tab; router bikin masalah 404 di GitHub Pages |
| Jangan pakai TypeScript | JavaScript + JSX saja |
| Jangan tambah dependency di luar daftar §3 | Tidak perlu date-fns, axios, zustand, dsb. |
| Jangan pakai `service_role` key | Hanya `anon` key di frontend |
| Jangan andalkan jam HP untuk kunci deadline | Jam HP bisa salah/diubah; DB yang mengunci |
| Jangan hardcode harga / minimal pemain | Selalu baca dari baris `sessions` |
| Jangan commit `.env.local` | Sudah masuk `.gitignore` bawaan Vite |

---

## 2. Tema visual — "Lapangan Badminton"

Palet diambil dari elemen lapangan badminton: karpet hijau, garis putih,
dan gabus shuttlecock berwarna amber. Semua kombinasi di bawah **sudah
diverifikasi lolos kontras WCAG AA**.

| Token | Hex | Pemakaian |
|---|---|---|
| `court-50` | `#E8F5EE` | latar badge hijau muda |
| `court-100` | `#C9E7D6` | border lembut, progress track |
| `court-500` | `#0E7C4A` | **warna utama** — tombol Ikut, header, progress bar |
| `court-600` | `#0A5C37` | hover tombol utama |
| `court-700` | `#074628` | teks di atas latar hijau muda |
| `cork-100` | `#FDF0DD` | latar badge "belum jawab" |
| `cork-500` | `#D98634` | **aksen** — ikon, border perhatian (bukan untuk teks di atas putih) |
| `cork-700` | `#A35A12` | teks aksen di atas putih |
| `ink` | `#0F1A14` | teks utama |
| `muted` | `#475569` | teks sekunder, status "tidak bisa" |
| `line` | `#E2E8F0` | garis pemisah, border kartu |
| `surface` | `#F7FAF8` | latar halaman |
| `danger` | `#B91C1C` | status BATAL |

Aturan pakai:
- Teks putih **boleh** di atas `court-500` (kontras 5.25:1 ✓)
- `cork-500` **hanya untuk fill/ikon/border**, jangan untuk teks di atas putih
  (kontras hanya 2.83:1 ✗). Untuk teks aksen gunakan `cork-700` (5.22:1 ✓)
- Status "Tidak bisa" pakai `muted` (abu), **bukan merah** — merah terasa
  menghakimi; merah hanya untuk sesi BATAL

Gaya lain:
- Font: **Inter** dari Google Fonts, fallback `system-ui, sans-serif`
- Sudut kartu: `rounded-2xl`; tombol: `rounded-xl`
- Lebar konten maksimal `480px`, selalu di tengah
- Tombol aksi utama minimal tinggi `56px` (nyaman untuk jempol)
- Jarak tepi layar 16px, tidak boleh ada scroll horizontal

---

## 3. Stack & inisialisasi

Kerjakan di root repo ini (folder sudah berisi dua file plan, biarkan).

```bash
npm create vite@latest . -- --template react
npm install
npm install @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite
```

**Tailwind yang dipakai versi 4** (konfigurasi via CSS, bukan
`tailwind.config.js`). Jangan buat `tailwind.config.js`.

### `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/pb-ahadi/',   // WAJIB: repo di-host di GitHub Pages sub-path
})
```

### `src/index.css`

```css
@import "tailwindcss";

@theme {
  --color-court-50:  #E8F5EE;
  --color-court-100: #C9E7D6;
  --color-court-500: #0E7C4A;
  --color-court-600: #0A5C37;
  --color-court-700: #074628;
  --color-cork-100:  #FDF0DD;
  --color-cork-500:  #D98634;
  --color-cork-700:  #A35A12;
  --color-ink:       #0F1A14;
  --color-muted:     #475569;
  --color-line:      #E2E8F0;
  --color-surface:   #F7FAF8;
  --color-danger:    #B91C1C;

  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
}

html { background: var(--color-surface); }
body { overscroll-behavior-y: none; }
```

Tambahkan di `index.html`: `<title>Badminton Sabtu</title>`, meta viewport
(sudah bawaan Vite), dan link Google Fonts untuk Inter (weight 400/500/600/700).

### `.env.local` (jangan di-commit)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Buat juga `.env.example` berisi dua kunci yang sama dengan nilai kosong.

---

## 4. Struktur file

```
src/
  main.jsx
  App.jsx                   # state global, fetch, realtime, tab switch
  index.css
  lib/
    supabase.js             # inisialisasi client
    identity.js             # simpan/baca memberId di localStorage
    logic.js                # SEMUA perhitungan bisnis (pure functions)
    format.js               # format tanggal & rupiah (Intl, locale id-ID)
  components/
    Header.jsx
    Tabs.jsx
    IdentityPicker.jsx
    SessionCard.jsx
    Countdown.jsx
    ProgressPemain.jsx
    AttendanceButtons.jsx
    CostEstimate.jsx
    MemberList.jsx
    CopyWaButton.jsx
    HistoryTab.jsx
```

Semua logika hitung berada di `lib/logic.js` sebagai **pure function** tanpa
import React dan tanpa akses `Date.now()` langsung (waktu selalu dikirim
sebagai argumen). Ini membuatnya bisa diuji dan diverifikasi manual.

---

## 5. Kontrak data (dari Supabase)

Nama tabel dan kolom **persis** seperti ini. Jangan diubah.

```
members     : id(uuid) nama(text) urutan(int) aktif(bool)
config      : id(1) harga_per_jam(int) durasi_jam(numeric) min_pemain(int) pembulatan(int)
sessions    : id(uuid) tanggal(date) deadline(timestamptz) harga_per_jam(int)
              durasi_jam(numeric) min_pemain(int) pembulatan(int)
              status_override('jadi'|'batal'|null) catatan(text)
attendances : id(uuid) session_id(uuid) member_id(uuid) ikut(bool) updated_at(timestamptz)
```

**Penting:** "belum jawab" TIDAK disimpan. Kalau tidak ada baris `attendances`
untuk pasangan (session, member), berarti orang itu belum menjawab.

### Panggilan API

```js
// 1. Pastikan sesi Sabtu berikutnya ada (idempoten, panggil tiap app load)
await supabase.rpc('ensure_next_session')

// 2. Data awal
supabase.from('members').select('*').eq('aktif', true).order('urutan')
supabase.from('sessions').select('*').order('tanggal', { ascending: false }).limit(1).single()
supabase.from('attendances').select('*').eq('session_id', sessionId)

// 3. Simpan jawaban
supabase.from('attendances')
  .upsert({ session_id, member_id, ikut }, { onConflict: 'session_id,member_id' })

// 4. Riwayat
supabase.from('sessions').select('*').order('tanggal', { ascending: false }).limit(20)
```

### Realtime

```js
const ch = supabase
  .channel('attendances-live')
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'attendances' },
      () => refetchAttendances())
  .subscribe()
// bersihkan di cleanup useEffect: supabase.removeChannel(ch)
```

### Penanganan error penting

Kalau deadline sudah lewat, PostgREST menolak dengan `error.code === '42501'`.
Tangkap khusus dan tampilkan:

> "Input sudah ditutup. Deadline Kamis jam 18:00 sudah lewat."

Jangan tampilkan pesan error mentah ke pengguna.

---

## 6. Logika bisnis (`src/lib/logic.js`)

Implementasikan persis seperti ini.

```js
// Total biaya sewa satu sesi
export function totalBiaya(session) {
  return Math.round(session.harga_per_jam * Number(session.durasi_jam))
}

// Biaya per orang, dibulatkan NAIK ke kelipatan `pembulatan`
export function biayaPerOrang(session, jumlahHadir) {
  if (!jumlahHadir || jumlahHadir <= 0) return 0
  const bulat = session.pembulatan || 1000
  return Math.ceil(totalBiaya(session) / jumlahHadir / bulat) * bulat
}

// Status sesi — DITURUNKAN dari data, tidak disimpan di DB
// return: 'open' | 'jadi' | 'batal'
export function statusSesi(session, jumlahIkut, now = new Date()) {
  if (session.status_override) return session.status_override
  if (now < new Date(session.deadline)) return 'open'
  return jumlahIkut >= session.min_pemain ? 'jadi' : 'batal'
}

// Gabungkan members + attendances → daftar siap tampil
// return: [{ id, nama, status: 'ikut' | 'tidak' | 'belum' }]
export function daftarStatus(members, attendances) {
  const map = new Map(attendances.map(a => [a.member_id, a.ikut]))
  return members.map(m => ({
    id: m.id,
    nama: m.nama,
    status: !map.has(m.id) ? 'belum' : (map.get(m.id) ? 'ikut' : 'tidak'),
  }))
}
```

### Tabel verifikasi biaya (harga 90.000/jam × 2 jam = 180.000)

Hasil `biayaPerOrang` **harus** sama persis dengan kolom kanan:

| Hadir | Per orang |
|---|---|
| 7 | Rp 26.000 |
| 8 | Rp 23.000 |
| 9 | Rp 20.000 |
| 10 | Rp 18.000 |

Kalau angkanya meleset, perbaiki implementasi — jangan ubah tabel ini.

---

## 7. Identitas (`src/lib/identity.js`)

```js
const KEY = 'pb-ahadi:member-id'
export const getMemberId = () => localStorage.getItem(KEY)
export const setMemberId = (id) => localStorage.setItem(KEY, id)
export const clearMemberId = () => localStorage.removeItem(KEY)
```

Alur:
1. App load → baca `getMemberId()`
2. Kosong, atau id-nya tidak ada di daftar `members` aktif → tampilkan
   `IdentityPicker` (daftar nama, satu tombol besar per nama)
3. Sudah terisi → tampilkan "Halo, {nama}" dengan tautan kecil **"bukan kamu?"**
   yang memanggil `clearMemberId()`

---

## 8. Halaman & komponen

Dua tab, dikelola dengan `useState`, **bukan router**: `"Minggu Ini"` dan `"Riwayat"`.

### Tab 1 — Minggu Ini

Urutan dari atas ke bawah:

**a. Header** — nama aplikasi + ikon shuttlecock kecil (inline SVG sederhana:
lingkaran gabus `cork-500` + beberapa garis bulu putih bergaris `line`).
Latar `court-500`, teks putih.

**b. Kartu sesi** (`SessionCard`) berisi:

1. Tanggal besar: `"Sabtu, 25 Oktober 2025"` (Intl, locale `id-ID`, TZ `Asia/Jakarta`)
2. `Countdown` — "Tutup dalam 2 hari 4 jam" / "Tutup dalam 3j 12m"; update tiap
   30 detik. Kalau sudah lewat, tampilkan "Input ditutup Kamis 18:00".
3. `ProgressPemain` — bar + teks `"6 dari 7 orang"`.
   - `< min_pemain` → bar `cork-500`, teks bantu `"butuh 1 orang lagi"`
   - `>= min_pemain` → bar `court-500`, teks `"sudah cukup, kelebihan 1 orang"`
4. `AttendanceButtons` — dua tombol sejajar, tinggi ≥56px:
   - **"Saya Ikut"** → `court-500`, teks putih
   - **"Nggak Bisa"** → outline `line`, teks `muted`
   - Pilihan aktif diberi ring tebal supaya jelas mana yang sedang dipilih
   - Saat menyimpan: tombol disabled + label "Menyimpan…"
   - Optimistic update boleh, tapi **wajib rollback** kalau request gagal
   - Sembunyikan kedua tombol kalau status ≠ `'open'`
5. `CostEstimate`:
   ```
   Rp 30.000 /orang
   Kalau 10 orang jadi Rp 18.000/orang
   ```
   Baris kedua hanya muncul kalau jumlah hadir < jumlah member aktif.
   Angka besar pakai `court-700`.
   Kalau belum ada yang ikut sama sekali, tampilkan "Belum ada yang ikut".
6. `MemberList` — 10 nama, grid 2 kolom di HP, badge status:
   - `ikut` → latar `court-50`, teks `court-700`, ikon ✓
   - `tidak` → latar putih, teks `muted`, ikon ✕
   - `belum` → latar `cork-100`, teks `cork-700`, ikon ⏳
   Nama pengguna sendiri diberi penanda tipis (ring `court-500`).
7. `CopyWaButton` — tombol lebar penuh, outline `court-500`.
   Menyalin teks ke clipboard, label berubah jadi "Tersalin ✓" selama 2 detik.

**c. Banner status** — kalau status ≠ `'open'`, ganti area tombol dengan banner:

| Status | Tampilan |
|---|---|
| `jadi` | Latar `court-500`, teks putih: **"JADI MAIN"** + "8 orang · Rp 23.000/orang" |
| `batal` | Latar `danger`, teks putih: **"BATAL"** + "cuma 5 orang, minimal 7" |

Kalau `status_override` terisi dan ada `catatan`, tampilkan catatan itu di bawah banner.

### Teks untuk WhatsApp

Format persis (gunakan `\n` sebagai pemisah baris):

```
🏸 Badminton Sabtu, 25 Oktober
Sudah 6 dari 7 orang.
Belum isi: Budi, Rian, Dimas
Estimasi Rp 30.000/orang.
Deadline Kamis jam 18:00.
https://<username>.github.io/pb-ahadi/
```

Aturan:
- Baris "Belum isi" dihilangkan kalau semua sudah menjawab
- Kalau status `jadi`: baris pertama setelah tanggal jadi `"JADI MAIN — 8 orang."`
- Kalau status `batal`: `"BATAL — cuma 5 orang."`
- URL diambil dari `window.location.href`
- Gunakan `navigator.clipboard.writeText`, dengan fallback `document.execCommand('copy')`
  untuk browser HP lama

### Tab 2 — Riwayat

Daftar 20 sesi terakhir. Satu baris kartu per sesi:

```
Sabtu, 18 Okt    [JADI]   8 orang · Rp 23.000/orang
Sabtu, 11 Okt    [BATAL]  5 orang
```

Ditekan → melebar, menampilkan nama-nama yang hadir.
Ambil attendances untuk semua sesi dalam satu query:
`.in('session_id', idList)` — jangan query per sesi (N+1).

---

## 9. Status loading & error

- **Loading awal**: skeleton kartu, bukan spinner polos
- **Gagal koneksi**: kartu pesan + tombol "Coba lagi"
- **Supabase sedang tidur** (free tier pause): request pertama bisa lambat
  atau gagal — pasang retry sekali dengan jeda 2 detik sebelum menyerah
- **Belum ada sesi sama sekali**: setelah `ensure_next_session()` tetap kosong,
  tampilkan "Belum ada jadwal. Coba muat ulang."

---

## 10. Deploy ke GitHub Pages

`.github/workflows/deploy.yml`:

```yaml
name: deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Langkah manual di GitHub:
1. **Settings → Pages → Source: GitHub Actions**
2. **Settings → Secrets and variables → Actions**, tambahkan `SUPABASE_URL`
   dan `SUPABASE_ANON_KEY`

> Catatan jujur: menaruh `anon key` di Secrets **tidak menyembunyikannya** —
> key itu tetap ikut ke dalam bundle JavaScript hasil build. Itu memang
> desainnya Supabase. Keamanan 100% bergantung pada RLS, bukan pada ini.
> Secrets dipakai hanya supaya key tidak tertulis di dalam repo.

---

## 11. Checklist penerimaan

Verifikasi satu per satu sebelum menyatakan selesai.

**Fungsional**
- [ ] Buka pertama kali → muncul pemilih nama; setelah dipilih tidak muncul lagi saat refresh
- [ ] "bukan kamu?" mengembalikan ke pemilih nama
- [ ] Tekan "Saya Ikut" → badge berubah, hitungan naik, biaya per orang turun
- [ ] Ganti ke "Nggak Bisa" → data ter-update (bukan membuat baris baru)
- [ ] Buka di dua perangkat → perubahan di satu perangkat muncul di perangkat lain tanpa refresh
- [ ] Angka biaya cocok dengan tabel verifikasi §6 (7→26.000, 8→23.000, 9→20.000, 10→18.000)
- [ ] Tombol salin WA menghasilkan teks persis seperti §8
- [ ] Tab Riwayat menampilkan sesi lama dengan status dan biaya yang benar

**Deadline & status**
- [ ] Setelah deadline lewat, tombol hilang dan banner JADI/BATAL muncul
- [ ] Mencoba kirim lewat DevTools setelah deadline → ditolak DB (`42501`), dan web
      menampilkan "Input sudah ditutup", bukan error mentah
- [ ] `status_override = 'batal'` di DB langsung terlihat di web

**Tampilan**
- [ ] Diuji di lebar layar 360px — tidak ada scroll horizontal
- [ ] Tombol aksi utama tinggi ≥56px
- [ ] Warna sesuai token §2, tidak ada warna di luar palet
- [ ] `cork-500` tidak dipakai sebagai warna teks di atas latar putih

**Build & deploy**
- [ ] `npm run build` sukses tanpa warning yang berarti
- [ ] Setelah deploy, `https://<username>.github.io/pb-ahadi/` terbuka normal
- [ ] Asset (CSS/JS) termuat — kalau 404, periksa `base` di `vite.config.js`

---

## 12. Urutan pengerjaan yang disarankan

1. Inisialisasi project + Tailwind + token tema → pastikan `npm run dev` jalan
2. `lib/supabase.js` + `lib/logic.js` + `lib/format.js`
3. Fetch data, tampilkan `MemberList` read-only — **hentikan dan pastikan data muncul**
4. `IdentityPicker` + localStorage
5. `AttendanceButtons` + upsert + penanganan error `42501`
6. `CostEstimate` + `ProgressPemain` + `Countdown` + banner status
7. `CopyWaButton`
8. Realtime
9. Tab Riwayat
10. Workflow deploy

Tahap 1–7 sudah cukup untuk dipakai Sabtu terdekat. Tahap 8–10 adalah
penyempurnaan.
