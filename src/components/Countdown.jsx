import { hariDeadline, jamDeadline } from '../lib/format.js'

const MENIT = 60 * 1000
const JAM = 60 * MENIT
const HARI = 24 * JAM

function sisaWaktu(ms) {
  if (ms >= HARI) {
    const hari = Math.floor(ms / HARI)
    const jam = Math.floor((ms % HARI) / JAM)
    return `${hari} hari${jam > 0 ? ` ${jam} jam` : ''}`
  }
  const jam = Math.floor(ms / JAM)
  const menit = Math.floor((ms % JAM) / MENIT)
  if (jam === 0 && menit === 0) return 'kurang dari 1 menit'
  return `${jam}j ${menit}m`
}

export default function Countdown({ deadline, now }) {
  const ms = new Date(deadline) - now
  if (ms <= 0) {
    return (
      <p className="text-sm font-medium text-muted">
        Input ditutup {hariDeadline(deadline)} {jamDeadline(deadline)}
      </p>
    )
  }
  return (
    <p className="text-sm font-medium text-cork-700">
      Tutup dalam {sisaWaktu(ms)}
    </p>
  )
}
