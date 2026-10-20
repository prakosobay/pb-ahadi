export default function ProgressPemain({ ikut, min }) {
  const cukup = ikut >= min
  const persen = Math.min(100, Math.round((ikut / Math.max(min, 1)) * 100))
  const kurang = min - ikut
  const lebih = ikut - min

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="whitespace-nowrap text-base font-semibold">{ikut} dari {min} orang</span>
        <span className={'text-sm font-medium ' + (cukup ? 'text-court-700' : 'text-cork-700')}>
          {cukup
            ? (lebih > 0 ? `sudah cukup, kelebihan ${lebih} orang` : 'sudah cukup')
            : `butuh ${kurang} orang lagi`}
        </span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-court-100"
        role="progressbar"
        aria-valuenow={ikut}
        aria-valuemin={0}
        aria-valuemax={min}
      >
        <div
          className={'h-full rounded-full transition-all ' + (cukup ? 'bg-court-500' : 'bg-cork-500')}
          style={{ width: `${persen}%` }}
        />
      </div>
    </div>
  )
}
