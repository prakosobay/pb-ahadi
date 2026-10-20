const GAYA = {
  ikut:  { kelas: 'bg-court-50 text-court-700 border-court-100', ikon: '✓', label: 'ikut' },
  tidak: { kelas: 'bg-white text-muted border-line', ikon: '✕', label: 'tidak bisa' },
  belum: { kelas: 'bg-cork-100 text-cork-700 border-cork-100', ikon: '⏳', label: 'belum jawab' },
}

export default function MemberList({ daftar, memberId }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {daftar.map(d => {
        const g = GAYA[d.status]
        const saya = d.id === memberId
        return (
          <li
            key={d.id}
            className={
              'flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ' +
              g.kelas + (saya ? ' ring-2 ring-court-500' : '')
            }
          >
            <span aria-label={g.label}>{g.ikon}</span>
            <span className="truncate">{d.nama}</span>
          </li>
        )
      })}
    </ul>
  )
}
