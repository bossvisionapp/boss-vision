import { ArrowRight, Briefcase, Building2, GraduationCap, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { homePath } from '../../components/Layout'
import { Logo } from '../../components/Logo'
import { Button, Field, Input } from '../../components/ui'
import { useStore } from '../../data/store'
import type { Role } from '../../types'

export const DEMO = [
  { email: 'alina@demo.kz', password: 'demo123', role: 'Кандидат', who: 'Алина — бизнес-ассистент, Mini Boss 73%', icon: UserRound },
  { email: 'aigerim@demo.kz', password: 'demo123', role: 'Предприниматель', who: 'Айгерим — ТОО Vision Group', icon: Building2 },
  { email: 'admin@demo.kz', password: 'admin123', role: 'Администратор', who: 'Вся админ-панель', icon: ShieldCheck },
  { email: 'curator@demo.kz', password: 'demo123', role: 'Куратор', who: 'Задания учеников и входящие', icon: GraduationCap },
]

/** Экран 1–2 макета: заставка + «Кто вы?» (ТЗ п.3) */
export default function Splash() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative flex min-h-[46vh] flex-col justify-between overflow-hidden bg-hero p-7 text-on-hero lux-grain lg:min-h-screen lg:p-14">
        <Skyline />
        <div className="relative">
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] opacity-70">HR · Career · Education</span>
        </div>
        <div className="relative fade-up">
          <Logo size="xl" tagline />
          <p className="mt-6 max-w-md text-[15px] leading-relaxed opacity-80">
            Платформа, где предприниматели находят сильных сотрудников с помощью AI, а специалисты — работу, обучение и карьеру.
          </p>
          <p className="mt-6 hidden text-xs uppercase tracking-[0.22em] opacity-60 lg:block">Обучение → Профиль → AI → Подбор → Найм → Карьера</p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md fade-up">
          <h1 className="font-display text-[32px] font-semibold">Кто вы?</h1>
          <p className="mt-1 text-sm text-muted">Выберите роль, чтобы мы настроили приложение под ваши цели</p>

          <div className="mt-6 space-y-3">
            <RoleCard
              title="Я ищу работу"
              text="Ищу вакансию, обучение и развитие"
              icon={<Briefcase size={22} />}
              onClick={() => nav('/start/candidate')}
            />
            <RoleCard
              title="Я предприниматель"
              text="Ищу сотрудников и хочу развивать команду"
              icon={<Building2 size={22} />}
              onClick={() => nav('/start/employer')}
              dark
            />
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-bold text-ink underline decoration-gold decoration-2 underline-offset-4">
              Войти
            </Link>
          </p>

          <DemoLogins />
        </div>
      </section>
    </div>
  )
}

function RoleCard({ title, text, icon, onClick, dark }: { title: string; text: string; icon: React.ReactNode; onClick: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 overflow-hidden rounded-[26px] p-5 text-left transition hover:-translate-y-0.5 ${dark ? 'bg-hero text-on-hero lux-grain' : 'border border-line bg-surface'}`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${dark ? 'bg-white/10' : 'bg-brand-soft text-brand'}`}>{icon}</div>
      <div className="flex-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        <p className={`text-[13px] ${dark ? 'opacity-75' : 'text-muted'}`}>{text}</p>
      </div>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full transition group-hover:translate-x-1 ${dark ? 'bg-white/15' : 'bg-accent text-on-accent'}`}>
        <ArrowRight size={17} />
      </span>
    </button>
  )
}

export function DemoLogins() {
  const { login, db } = useStore()
  const nav = useNavigate()
  return (
    <div className="mt-9">
      <div className="mb-3 flex items-center gap-3">
        <div className="lux-line flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Демо-доступ</span>
        <div className="lux-line flex-1" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DEMO.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => {
              if (!login(a.email, a.password)) nav(homePath(db.users.find((u) => u.email === a.email)!.role as Role))
            }}
            className="rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-gold"
          >
            <a.icon size={18} className="text-brand" />
            <p className="mt-1.5 text-[13px] font-bold">{a.role}</p>
            <p className="line-clamp-1 text-[11px] text-muted">{a.who}</p>
            <p className="mt-1 text-[10px] text-muted/80">
              {a.email} · {a.password}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Силуэт города (как фото Алматы на заставке макета) — чистый SVG, без картинок */
function Skyline() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full opacity-[0.08]" viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <path
        fill="currentColor"
        d="M0 300V210h40v-40h30v60h25V150h20v-30h12v30h18v80h30V90h14V60h6v30h14v140h28v-70h40v70h20V120l25-30 25 30v110h22v-60h36v60h24V40h8V20h4v20h8v190h26v-90h30v90h20v-50h44v50h30V130h18v-20h14v20h16v100h34v-60h28v60h26v-90h40v90h34v70z"
      />
      <path fill="currentColor" d="M600 300 L700 140 L800 300Z" opacity=".5" />
    </svg>
  )
}

export function Login() {
  const { login, db } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const err = login(email, password)
    if (err) return setError(err)
    nav(homePath(db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())!.role))
  }
  return (
    <AuthFrame title="Вход" subtitle="С возвращением в BOSS VISION">
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.kz" />
        </Field>
        <Field label="Пароль">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        </Field>
        {error && <p className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full">
          Войти
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Нет аккаунта?{' '}
        <Link to="/" className="font-bold text-ink underline decoration-gold decoration-2 underline-offset-4">
          Зарегистрироваться
        </Link>
      </p>
      <DemoLogins />
    </AuthFrame>
  )
}

export function AuthFrame({ title, subtitle, children, step }: { title: string; subtitle?: string; children: React.ReactNode; step?: { i: number; n: number } }) {
  const nav = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center px-5 py-6 sm:justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <button type="button" onClick={() => nav(-1)} className="text-sm font-semibold text-muted hover:text-ink">
            ← Назад
          </button>
          <Logo size="sm" />
          <span className="w-12 text-right text-xs text-muted">{step ? `${step.i}/${step.n}` : ''}</span>
        </div>
        {step && (
          <div className="mb-6 flex gap-1">
            {Array.from({ length: step.n }).map((_, k) => (
              <div key={k} className={`h-1 flex-1 rounded-full transition ${k < step.i ? 'bg-gold' : 'bg-line'}`} />
            ))}
          </div>
        )}
        <div className="fade-up" key={title}>
          <h1 className="font-display text-[30px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
          <Sparkles size={12} className="text-gold" /> Build your vision. Build your career.
        </p>
      </div>
    </div>
  )
}
