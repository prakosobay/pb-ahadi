// pilihan: true (ikut) | false (tidak) | undefined (belum jawab)
export default function AttendanceButtons({ pilihan, saving, onPilih }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        disabled={saving}
        onClick={() => onPilih(true)}
        aria-pressed={pilihan === true}
        className={
          'min-h-14 rounded-xl bg-court-500 px-3 text-base font-bold text-white hover:bg-court-600 disabled:opacity-60 ' +
          (pilihan === true ? 'ring-4 ring-court-700 ring-offset-2' : '')
        }
      >
        {saving ? 'Menyimpan…' : 'Saya Ikut'}
      </button>
      <button
        disabled={saving}
        onClick={() => onPilih(false)}
        aria-pressed={pilihan === false}
        className={
          'min-h-14 rounded-xl border-2 border-line bg-white px-3 text-base font-bold text-muted disabled:opacity-60 ' +
          (pilihan === false ? 'ring-4 ring-muted ring-offset-2' : '')
        }
      >
        {saving ? 'Menyimpan…' : 'Nggak Bisa'}
      </button>
    </div>
  )
}
