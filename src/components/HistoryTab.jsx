import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { tanggalPendek, rupiah } from '../lib/format.js'
import { biayaPerOrang, statusSesi } from '../lib/logic.js'

const BADGE = {
  jadi:  { teks: 'JADI',  kelas: 'bg-court-500 text-white' },
  batal: { teks: 'BATAL', kelas: 'bg-danger text-white' },
  open:  { teks: 'BUKA',  kelas: 'bg-cork-100 text-cork-700' },
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-line" />
      ))}
    </div>
  )
}

export default function HistoryTab({ now }) {
  const [data, setData] = useState(null)   // { sessions, attendances, namaById }
  const [error, setError] = useState(false)
  const [terbuka, setTerbuka] = useState(null)
  const [percobaan, setPercobaan] = useState(0)

  useEffect(() => {
    let batal = false
    async function muat() {
      setError(false)
      const { data: sessions, error: e1 } = await supabase
        .from('sessions').select('*')
        .order('tanggal', { ascending: false }).limit(20)
      if (e1) throw e1

      const ids = sessions.map(s => s.id)
      // Satu query untuk semua sesi (bukan N+1)
      const [att, mem] = await Promise.all([
        ids.length
          ? supabase.from('attendances').select('*').in('session_id', ids)
          : Promise.resolve({ data: [], error: null }),
        // semua anggota (termasuk nonaktif) supaya nama di riwayat lama tetap muncul
        supabase.from('members').select('id, nama'),
      ])
      if (att.error) throw att.error
      if (mem.error) throw mem.error
      return {
        sessions,
        attendances: att.data,
        namaById: new Map(mem.data.map(m => [m.id, m.nama])),
      }
    }
    muat()
      .then(d => { if (!batal) setData(d) })
      .catch(() => { if (!batal) setError(true) })
    return () => { batal = true }
  }, [percobaan])

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4 text-center">
        <p className="font-semibold">Riwayat gagal dimuat.</p>
        <button
          onClick={() => { setData(null); setPercobaan(p => p + 1) }}
          className="mt-3 min-h-12 rounded-xl bg-court-500 px-6 font-bold text-white"
        >
          Coba lagi
        </button>
      </div>
    )
  }
  if (!data) return <Skeleton />
  if (data.sessions.length === 0) {
    return <p className="rounded-2xl border border-line bg-white p-4 text-muted">Belum ada riwayat.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.sessions.map(s => {
        const hadir = data.attendances
          .filter(a => a.session_id === s.id && a.ikut)
          .map(a => data.namaById.get(a.member_id) ?? '(anggota dihapus)')
        const status = statusSesi(s, hadir.length, now)
        const b = BADGE[status]
        const buka = terbuka === s.id
        return (
          <li key={s.id} className="rounded-2xl border border-line bg-white">
            <button
              onClick={() => setTerbuka(buka ? null : s.id)}
              aria-expanded={buka}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex-1">
                <span className="block font-semibold">{tanggalPendek(s.tanggal)}</span>
                <span className="block text-sm text-muted">
                  {hadir.length} orang
                  {status === 'jadi' && ` · ${rupiah(biayaPerOrang(s, hadir.length))}/orang`}
                </span>
              </span>
              <span className={'rounded-lg px-2 py-1 text-xs font-bold ' + b.kelas}>{b.teks}</span>
            </button>
            {buka && (
              <div className="border-t border-line px-4 py-3 text-sm">
                {hadir.length > 0
                  ? <p><span className="font-semibold">Hadir:</span> {hadir.join(', ')}</p>
                  : <p className="text-muted">Tidak ada yang ikut.</p>}
                {s.status_override && s.catatan && (
                  <p className="mt-2 text-muted">{s.catatan}</p>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
