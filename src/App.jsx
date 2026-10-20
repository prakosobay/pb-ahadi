import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, configured } from './lib/supabase.js'
import { getMemberId, setMemberId, clearMemberId } from './lib/identity.js'
import { hariDeadline, jamDeadline } from './lib/format.js'
import Header from './components/Header.jsx'
import Tabs from './components/Tabs.jsx'
import IdentityPicker from './components/IdentityPicker.jsx'
import SessionCard from './components/SessionCard.jsx'
import HistoryTab from './components/HistoryTab.jsx'

const TICK_MS = 30 * 1000
const JEDA_RETRY_MS = 2000
const KODE_RLS = '42501'

const tunggu = (ms) => new Promise(r => setTimeout(r, ms))

// Supabase free tier yang tertidur bisa lambat / gagal di request pertama:
// coba sekali lagi setelah 2 detik sebelum menyerah.
async function denganRetry(fn) {
  try { return await fn() } catch {
    await tunggu(JEDA_RETRY_MS)
    return fn()
  }
}

async function ambilAttendances(sessionId) {
  const { data, error } = await supabase
    .from('attendances').select('*').eq('session_id', sessionId)
  if (error) throw error
  return data
}

async function ambilDataAwal() {
  // Idempoten: memastikan sesi Sabtu berikutnya sudah ada
  const { error: e0 } = await supabase.rpc('ensure_next_session')
  if (e0) throw e0

  const [m, s] = await Promise.all([
    supabase.from('members').select('*').eq('aktif', true).order('urutan'),
    supabase.from('sessions').select('*')
      .order('tanggal', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (m.error) throw m.error
  if (s.error) throw s.error

  const attendances = s.data ? await ambilAttendances(s.data.id) : []
  return { members: m.data, session: s.data, attendances }
}

function Kartu({ judul, children }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 text-center">
      <p className="font-semibold">{judul}</p>
      {children}
    </div>
  )
}

function TombolUlang({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 min-h-12 rounded-xl bg-court-500 px-6 font-bold text-white hover:bg-court-600"
    >
      Coba lagi
    </button>
  )
}

function SkeletonKartu() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4" aria-busy="true">
      <div className="h-8 w-3/4 animate-pulse rounded-lg bg-line" />
      <div className="h-3 w-full animate-pulse rounded-full bg-line" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 animate-pulse rounded-xl bg-line" />
        <div className="h-14 animate-pulse rounded-xl bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-line" />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('minggu')
  const [muat, setMuat] = useState('loading')   // 'loading' | 'ok' | 'error'
  const [members, setMembers] = useState([])
  const [session, setSession] = useState(null)
  const [attendances, setAttendances] = useState([])
  const [memberId, setMemberIdState] = useState(() => getMemberId())
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState(null)

  // Jam untuk tampilan. `skew` mengoreksi jam HP yang tertinggal bila DB
  // menolak karena deadline sebenarnya sudah lewat. Yang mengunci tetap DB.
  const skew = useRef(0)
  const [now, setNow] = useState(() => new Date())
  const perbaruiJam = useCallback(() => setNow(new Date(Date.now() + skew.current)), [])

  const [percobaan, setPercobaan] = useState(0)

  // ---- muat data awal ----
  useEffect(() => {
    if (!configured) return
    let batal = false
    setMuat('loading')
    denganRetry(ambilDataAwal)
      .then(d => {
        if (batal) return
        setMembers(d.members)
        setSession(d.session)
        setAttendances(d.attendances)
        setMuat('ok')
      })
      .catch(() => { if (!batal) setMuat('error') })
    return () => { batal = true }
  }, [percobaan])

  // ---- jam berdetak ----
  useEffect(() => {
    const t = setInterval(perbaruiJam, TICK_MS)
    return () => clearInterval(t)
  }, [perbaruiJam])

  const sessionId = session?.id

  const segarkanAttendances = useCallback(async () => {
    if (!sessionId) return
    try { setAttendances(await ambilAttendances(sessionId)) } catch { /* biarkan data lama */ }
  }, [sessionId])

  // ---- realtime ----
  useEffect(() => {
    if (!configured || !sessionId) return
    const ch = supabase
      .channel('attendances-live')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'attendances' },
        () => segarkanAttendances())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, segarkanAttendances])

  // HP yang tidur memutus websocket: sinkronkan lagi saat tab kembali aktif
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      perbaruiJam()
      segarkanAttendances()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [perbaruiJam, segarkanAttendances])

  // ---- identitas ----
  const saya = members.find(m => m.id === memberId)

  function pilihIdentitas(id) {
    setMemberId(id)
    setMemberIdState(id)
  }
  function bukanSaya() {
    clearMemberId()
    setMemberIdState(null)
    setPesan(null)
  }

  // ---- simpan jawaban ----
  async function simpan(ikut) {
    if (saving || !saya || !session) return
    const sebelumnya = attendances
    setSaving(true)
    setPesan(null)
    // optimistic update (di-rollback bila gagal)
    setAttendances(cur =>
      cur.some(a => a.member_id === saya.id)
        ? cur.map(a => (a.member_id === saya.id ? { ...a, ikut } : a))
        : [...cur, { id: `tmp-${saya.id}`, session_id: session.id, member_id: saya.id, ikut }])

    const { error } = await supabase
      .from('attendances')
      .upsert(
        { session_id: session.id, member_id: saya.id, ikut },
        { onConflict: 'session_id,member_id' },
      )
    setSaving(false)

    if (error) {
      setAttendances(sebelumnya)
      if (error.code === KODE_RLS) {
        // DB bilang sudah lewat deadline → samakan jam tampilan
        skew.current = Math.max(skew.current, new Date(session.deadline) - Date.now() + 1000)
        perbaruiJam()
        setPesan(
          `Input sudah ditutup. Deadline ${hariDeadline(session.deadline)} jam ${jamDeadline(session.deadline)} sudah lewat.`)
      } else {
        setPesan('Gagal menyimpan. Periksa koneksi lalu coba lagi.')
      }
    }
    segarkanAttendances()
  }

  // ---- tampilan ----
  let isi
  if (tab === 'riwayat') {
    isi = configured ? <HistoryTab now={now} /> : null
  } else if (!configured) {
    isi = (
      <Kartu judul="Konfigurasi Supabase belum diisi.">
        <p className="mt-1 text-sm text-muted">
          Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.local, lalu jalankan ulang.
        </p>
      </Kartu>
    )
  } else if (muat === 'loading') {
    isi = <SkeletonKartu />
  } else if (muat === 'error') {
    isi = (
      <Kartu judul="Tidak bisa terhubung ke server.">
        <p className="mt-1 text-sm text-muted">Periksa koneksi internet kamu.</p>
        <TombolUlang onClick={() => setPercobaan(p => p + 1)} />
      </Kartu>
    )
  } else if (!session) {
    isi = (
      <Kartu judul="Belum ada jadwal. Coba muat ulang.">
        <TombolUlang onClick={() => setPercobaan(p => p + 1)} />
      </Kartu>
    )
  } else if (!saya) {
    isi = <IdentityPicker members={members} onPilih={pilihIdentitas} />
  } else {
    isi = (
      <>
        <p className="flex items-center justify-between text-sm">
          <span>Halo, <span className="font-semibold">{saya.nama}</span></span>
          <button onClick={bukanSaya} className="min-h-11 px-2 text-court-600 underline">
            bukan kamu?
          </button>
        </p>
        {pesan && (
          <p role="alert" className="rounded-xl border border-danger bg-white p-3 text-sm font-medium text-danger">
            {pesan}
          </p>
        )}
        <SessionCard
          session={session}
          members={members}
          attendances={attendances}
          memberId={saya.id}
          now={now}
          saving={saving}
          onPilih={simpan}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-ink">
      <Header />
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 py-4">
        <Tabs aktif={tab} onChange={setTab} />
        {isi}
      </main>
    </div>
  )
}
