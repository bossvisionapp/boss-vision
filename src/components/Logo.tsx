// Логотип BOSS VISION — типографский, как в макете: серифная надпись + слоган.
export function Logo({ size = 'md', tagline, className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; tagline?: boolean; className?: string }) {
  const fs = { sm: 'text-[17px]', md: 'text-[22px]', lg: 'text-[34px]', xl: 'text-[52px]' }[size]
  return (
    <div className={`leading-none ${className}`}>
      <div className={`font-display font-bold uppercase tracking-[-0.02em] ${fs}`}>Boss Vision</div>
      {tagline && <div className="mt-2 text-[11px] font-medium tracking-[0.18em] uppercase opacity-70">Build your vision. Build your career.</div>}
    </div>
  )
}

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center rounded-xl bg-accent font-display font-bold text-on-accent" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      BV
    </div>
  )
}
