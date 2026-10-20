import { tanggalPanjang, rupiah } from '../lib/format.js'
import { biayaPerOrang, daftarStatus, statusSesi, teksWhatsApp } from '../lib/logic.js'
import Countdown from './Countdown.jsx'
import ProgressPemain from './ProgressPemain.jsx'
import AttendanceButtons from './AttendanceButtons.jsx'
import CostEstimate from './CostEstimate.jsx'
import MemberList from './MemberList.jsx'
import CopyWaButton from './CopyWaButton.jsx'

function Banner({ status, session, ikut }) {
  if (status === 'jadi') {
    return (
      <div className="rounded-xl bg-court-500 p-4 text-white">
        <p className="text-2xl font-bold">JADI MAIN</p>
        <p className="mt-1 text-sm font-medium">
          {ikut} orang · {rupiah(biayaPerOrang(session, ikut))}/orang
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-danger p-4 text-white">
      <p className="text-2xl font-bold">BATAL</p>
      <p className="mt-1 text-sm font-medium">
        cuma {ikut} orang, minimal {session.min_pemain}
      </p>
    </div>
  )
}

export default function SessionCard({
  session, members, attendances, memberId, now, saving, onPilih,
}) {
  const daftar = daftarStatus(members, attendances)
  const ikut = daftar.filter(d => d.status === 'ikut').length
  const status = statusSesi(session, ikut, now)
  const saya = daftar.find(d => d.id === memberId)
  const pilihan = saya ? { ikut: true, tidak: false }[saya.status] : undefined

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-4">
      <div>
        <h2 className="text-2xl font-bold">{tanggalPanjang(session.tanggal)}</h2>
        <Countdown deadline={session.deadline} now={now} />
      </div>

      <ProgressPemain ikut={ikut} min={session.min_pemain} />

      {status === 'open' ? (
        <AttendanceButtons pilihan={pilihan} saving={saving} onPilih={onPilih} />
      ) : (
        <div>
          <Banner status={status} session={session} ikut={ikut} />
          {session.status_override && session.catatan && (
            <p className="mt-2 text-sm text-muted">{session.catatan}</p>
          )}
        </div>
      )}

      <CostEstimate session={session} ikut={ikut} jumlahMember={members.length} />

      <MemberList daftar={daftar} memberId={memberId} />

      <CopyWaButton
        getTeks={() => teksWhatsApp(session, daftar, status, window.location.href)}
      />
    </section>
  )
}
