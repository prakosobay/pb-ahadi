// Format tanggal & rupiah. Locale id-ID, zona waktu WIB.
const TZ = 'Asia/Jakarta'

// `tanggal` dari DB berupa 'YYYY-MM-DD' (tanpa zona) → anggap tengah malam WIB
const dariTanggal = (tanggal) => new Date(`${tanggal}T00:00:00+07:00`)

const fmt = (opts) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, ...opts })

const F_PANJANG = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const F_TANPA_TAHUN = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const F_PENDEK = fmt({ weekday: 'long', day: 'numeric', month: 'short' })
const F_HARI = fmt({ weekday: 'long' })
const F_JAM = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const F_ANGKA = new Intl.NumberFormat('id-ID')

// "Sabtu, 25 Oktober 2025"
export const tanggalPanjang = (t) => F_PANJANG.format(dariTanggal(t))
// "Sabtu, 25 Oktober"
export const tanggalTanpaTahun = (t) => F_TANPA_TAHUN.format(dariTanggal(t))
// "Sabtu, 18 Okt"
export const tanggalPendek = (t) => F_PENDEK.format(dariTanggal(t))

// "Kamis" dan "18:00" dari deadline (timestamptz), dalam WIB
export const hariDeadline = (deadline) => F_HARI.format(new Date(deadline))
export const jamDeadline = (deadline) =>
  F_JAM.format(new Date(deadline)).replace('.', ':')

// 26000 → "Rp 26.000"
export const rupiah = (n) => `Rp ${F_ANGKA.format(n)}`
