function Shuttlecock() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      {/* bulu */}
      <g stroke="#E2E8F0" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M13 14 L6 3" />
        <path d="M16 14 L16 2" />
        <path d="M19 14 L26 3" />
        <path d="M14.5 14 L11 2.5" />
        <path d="M17.5 14 L21 2.5" />
      </g>
      {/* gabus */}
      <circle cx="16" cy="21" r="8" fill="#D98634" />
    </svg>
  )
}

export default function Header() {
  return (
    <header className="bg-court-500 text-white">
      <div className="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-4">
        <Shuttlecock />
        <h1 className="text-lg font-bold">Badminton Sabtu</h1>
      </div>
    </header>
  )
}
