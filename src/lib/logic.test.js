import test from 'node:test'
import assert from 'node:assert/strict'
import { totalBiaya, biayaPerOrang, statusSesi, daftarStatus, teksWhatsApp } from './logic.js'
import { rupiah, tanggalPanjang, hariDeadline, jamDeadline } from './format.js'

const sesi = {
  tanggal: '2025-10-25',
  deadline: '2025-10-23T11:00:00+00:00', // Kamis 18:00 WIB
  harga_per_jam: 90000, durasi_jam: '2.0', min_pemain: 7, pembulatan: 1000,
  status_override: null, catatan: null,
}

test('totalBiaya = 180.000', () => assert.equal(totalBiaya(sesi), 180000))

test('tabel verifikasi biaya §6', () => {
  for (const [hadir, harapan] of [[7, 26000], [8, 23000], [9, 20000], [10, 18000], [6, 30000]]) {
    assert.equal(biayaPerOrang(sesi, hadir), harapan, `hadir ${hadir}`)
  }
})

test('biayaPerOrang aman untuk 0 / undefined', () => {
  assert.equal(biayaPerOrang(sesi, 0), 0)
  assert.equal(biayaPerOrang(sesi, undefined), 0)
})

test('statusSesi', () => {
  const sebelum = new Date('2025-10-23T10:59:59Z')
  const sesudah = new Date('2025-10-23T11:00:00Z')
  assert.equal(statusSesi(sesi, 0, sebelum), 'open')
  assert.equal(statusSesi(sesi, 6, sesudah), 'batal')
  assert.equal(statusSesi(sesi, 7, sesudah), 'jadi')
  assert.equal(statusSesi({ ...sesi, status_override: 'batal' }, 10, sebelum), 'batal')
  assert.equal(statusSesi({ ...sesi, status_override: 'jadi' }, 0, sesudah), 'jadi')
})

test('daftarStatus: belum jawab = tidak ada baris', () => {
  const members = [{ id: 'a', nama: 'A' }, { id: 'b', nama: 'B' }, { id: 'c', nama: 'C' }]
  const att = [{ member_id: 'a', ikut: true }, { member_id: 'b', ikut: false }]
  assert.deepEqual(daftarStatus(members, att).map(d => d.status), ['ikut', 'tidak', 'belum'])
})

test('format', () => {
  assert.equal(rupiah(26000), 'Rp 26.000')
  assert.equal(tanggalPanjang('2025-10-25'), 'Sabtu, 25 Oktober 2025')
  assert.equal(hariDeadline(sesi.deadline), 'Kamis')
  assert.equal(jamDeadline(sesi.deadline), '18:00')
})

test('teks WhatsApp (open) persis sesuai format', () => {
  const nama = ['Ari', 'Budi', 'Rian', 'Dimas', 'E', 'F', 'G', 'H', 'I']
  const members = nama.map((n, i) => ({ id: `${i}`, nama: n }))
  const att = [0, 1, 2, 3, 4, 5].map(i => ({ member_id: `${i}`, ikut: true }))
  const d = daftarStatus(members, att)
  assert.equal(
    teksWhatsApp(sesi, d, 'open', 'https://x.github.io/pb-ahadi/'),
    [
      '🏸 Badminton Sabtu, 25 Oktober',
      'Sudah 6 dari 7 orang.',
      'Belum isi: G, H, I',
      'Estimasi Rp 30.000/orang.',
      'Deadline Kamis jam 18:00.',
      'https://x.github.io/pb-ahadi/',
    ].join('\n'),
  )
})

test('teks WhatsApp: jadi, batal, semua sudah isi', () => {
  const m = [{ id: '1', nama: 'A' }, { id: '2', nama: 'B' }]
  const d = daftarStatus(m, [{ member_id: '1', ikut: true }, { member_id: '2', ikut: false }])
  const jadi = teksWhatsApp(sesi, d, 'jadi', 'u').split('\n')
  assert.equal(jadi[1], 'JADI MAIN — 1 orang.')
  assert.ok(!jadi.some(l => l.startsWith('Belum isi')))
  const batal = teksWhatsApp(sesi, d, 'batal', 'u').split('\n')
  assert.equal(batal[1], 'BATAL — cuma 1 orang.')
  assert.ok(!batal.some(l => l.startsWith('Estimasi')))
})
