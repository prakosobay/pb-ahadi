import { biayaPerOrang } from '../lib/logic.js'
import { rupiah } from '../lib/format.js'

export default function CostEstimate({ session, ikut, jumlahMember }) {
  if (ikut <= 0) {
    return <p className="text-base font-medium text-muted">Belum ada yang ikut</p>
  }
  const sekarang = biayaPerOrang(session, ikut)
  return (
    <div>
      <p className="text-3xl font-bold text-court-700">
        {rupiah(sekarang)} <span className="text-base font-medium">/orang</span>
      </p>
      {ikut < jumlahMember && (
        <p className="mt-1 text-sm text-muted">
          Kalau {jumlahMember} orang jadi {rupiah(biayaPerOrang(session, jumlahMember))}/orang
        </p>
      )}
    </div>
  )
}
