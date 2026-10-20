// SEMUA perhitungan bisnis. Pure function: tanpa React, tanpa akses jam global
// (waktu dikirim sebagai argumen).
import { tanggalTanpaTahun, hariDeadline, jamDeadline, rupiah } from './format.js'

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

// Teks untuk ditempel ke grup WhatsApp
export function teksWhatsApp(session, daftar, status, url) {
  const ikut = daftar.filter(d => d.status === 'ikut').length
  const belum = daftar.filter(d => d.status === 'belum').map(d => d.nama)
  const baris = [`🏸 Badminton ${tanggalTanpaTahun(session.tanggal)}`]

  if (status === 'jadi') baris.push(`JADI MAIN — ${ikut} orang.`)
  else if (status === 'batal') baris.push(`BATAL — cuma ${ikut} orang.`)
  else baris.push(`Sudah ${ikut} dari ${session.min_pemain} orang.`)

  if (belum.length > 0) baris.push(`Belum isi: ${belum.join(', ')}`)
  if (ikut > 0 && status !== 'batal') {
    baris.push(`Estimasi ${rupiah(biayaPerOrang(session, ikut))}/orang.`)
  }
  baris.push(`Deadline ${hariDeadline(session.deadline)} jam ${jamDeadline(session.deadline)}.`)
  baris.push(url)
  return baris.join('\n')
}
