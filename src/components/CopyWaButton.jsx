import { useEffect, useRef, useState } from 'react'

async function salin(teks) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks)
      return true
    }
  } catch { /* lanjut ke fallback */ }
  // Fallback untuk browser HP lama
  const ta = document.createElement('textarea')
  ta.value = teks
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  document.body.removeChild(ta)
  return ok
}

export default function CopyWaButton({ getTeks }) {
  const [status, setStatus] = useState('diam') // 'diam' | 'ok' | 'gagal'
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function onClick() {
    const ok = await salin(getTeks())
    setStatus(ok ? 'ok' : 'gagal')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('diam'), 2000)
  }

  return (
    <button
      onClick={onClick}
      className="min-h-14 w-full rounded-xl border-2 border-court-500 bg-white px-4 text-base font-bold text-court-600 hover:bg-court-50"
    >
      {status === 'ok' ? 'Tersalin ✓' : status === 'gagal' ? 'Gagal menyalin' : 'Salin teks untuk WhatsApp'}
    </button>
  )
}
