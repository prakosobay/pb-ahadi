export default function IdentityPicker({ members, onPilih }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h2 className="text-xl font-bold">Kamu siapa?</h2>
      <p className="mt-1 text-sm text-muted">
        Pilih namamu sekali saja. Pilihan ini diingat di HP ini.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {members.map(m => (
          <button
            key={m.id}
            onClick={() => onPilih(m.id)}
            className="min-h-14 rounded-xl border border-line bg-white px-4 text-left text-base font-semibold text-ink hover:bg-court-50 active:bg-court-50"
          >
            {m.nama}
          </button>
        ))}
      </div>
    </section>
  )
}
