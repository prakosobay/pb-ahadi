const TABS = [
  { id: 'minggu', label: 'Minggu Ini' },
  { id: 'riwayat', label: 'Riwayat' },
]

export default function Tabs({ aktif, onChange }) {
  return (
    <nav className="flex gap-2 rounded-2xl border border-line bg-white p-1" role="tablist">
      {TABS.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={aktif === t.id}
          onClick={() => onChange(t.id)}
          className={
            'min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ' +
            (aktif === t.id ? 'bg-court-500 text-white' : 'text-muted')
          }
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
