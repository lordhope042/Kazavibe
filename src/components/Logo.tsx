export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-extrabold">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeLinecap="round" aria-hidden="true">
        <circle cx="10" cy="6" r="4" fill="#FF8A2A" /><path d="M12 18v24" stroke="#FF8A2A" strokeWidth="9" />
        <path d="M15 31L38 9" stroke="#FF6B2C" strokeWidth="8" /><path d="M20 28l18 14" stroke="#FF6B2C" strokeWidth="8" /><circle cx="41" cy="30" r="4" fill="#FF6B2C" />
      </svg>
      <span>Kaza<span className="text-brand">Vibe</span></span>
    </span>
  );
}
