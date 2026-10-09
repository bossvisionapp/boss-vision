import { ArrowLeft, X } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { initials, type Tone } from '../lib/format'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'soft'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold tracking-tight transition duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' && 'h-9 px-3.5 text-[13px]',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-[52px] px-6 text-[15px]',
        variant === 'primary' && 'bg-accent text-on-accent shadow-[0_8px_20px_-10px_var(--c-accent)] hover:opacity-90',
        variant === 'gold' && 'bg-gold text-white shadow-[0_8px_22px_-10px_var(--c-gold)] hover:brightness-105',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-brand',
        variant === 'soft' && 'bg-brand-soft text-brand hover:brightness-95',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-ink',
        variant === 'danger' && 'bg-danger-soft text-danger hover:brightness-95',
        className,
      )}
    />
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'rounded-3xl border border-line/70 bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,.02),0_10px_30px_-22px_rgba(40,30,20,.35)]',
        onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:border-brand/40',
        className,
      )}
    >
      {children}
    </div>
  )
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  brand: 'bg-brand-soft text-brand',
  dark: 'bg-accent text-on-accent',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold', TONES[tone], className)}>{children}</span>
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition',
        active ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

const inputCls = 'w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/10'

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, 'h-12', p.className)} />
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(inputCls, 'min-h-28 py-3 leading-relaxed', p.className)} />
}
export function Select({ options, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...p} className={cx(inputCls, 'h-12 appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10', p.className)} style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23998877%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")' }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      {label && <span className="text-sm">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}
      >
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-surface shadow transition', checked ? 'left-6' : 'left-1')} />
      </button>
    </label>
  )
}

export function Avatar({ name, color, photo, size = 40, ring }: { name: string; color: string; photo?: string; size?: number; ring?: boolean }) {
  return (
    <div
      className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white', ring && 'ring-2 ring-gold ring-offset-2 ring-offset-surface')}
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx('fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-surface p-5 pb-8 sm:rounded-[28px] sm:pb-5', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-surface-2" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: string; action?: ReactNode; back?: boolean }) {
  const nav = useNavigate()
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-2">
        {back && (
          <button type="button" onClick={() => nav(-1)} className="no-print -ml-1 mt-1 rounded-full p-1.5 text-muted hover:bg-surface-2" aria-label="Назад">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {action}
    </div>
  )
}

export function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 truncate text-xs text-muted">{label}</p>
        {hint && <p className="text-[11px] font-semibold text-success">{hint}</p>}
      </div>
    </Card>
  )
}

export function Progress({ value, className, gold }: { value: number; className?: string; gold?: boolean }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className={cx('h-full rounded-full transition-all duration-700', gold ? 'bg-gold' : 'bg-accent')} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke - 2) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--c-surface-2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--c-gold)" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-semibold" style={{ fontSize: size * 0.26 }}>
          {Math.round(value)}%
        </span>
        {label && <span className="mt-0.5 text-[9px] text-muted">{label}</span>}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scrollbar-none -mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cx('relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1 text-sm font-semibold transition', value === t.id ? 'text-ink' : 'text-muted hover:text-ink')}
        >
          {t.label}
          {t.count != null && t.count > 0 && <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 text-[11px]">{t.count}</span>}
          {value === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" />}
        </button>
      ))}
    </div>
  )
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand"
      />
    </div>
  )
}

/** Список тегов с удалением + ввод нового (навыки, инструменты) */
export function TagEditor({ value, onChange, suggestions = [], placeholder }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const add = (s: string) => {
    const v = s.trim()
    if (v && !value.includes(v)) onChange([...value, v])
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((s) => (
          <span key={s} className="flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-[13px] font-semibold text-brand">
            {s}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} className="rounded-full p-0.5 hover:bg-black/5" aria-label="Удалить">
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <input
        placeholder={placeholder ?? 'Введите и нажмите Enter'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add((e.target as HTMLInputElement).value)
            ;(e.target as HTMLInputElement).value = ''
          }
        }}
        className={cx(inputCls, 'h-11')}
      />
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 14)
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted hover:border-brand hover:text-brand">
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export function Divider() {
  return <div className="lux-line my-5 opacity-60" />
}
