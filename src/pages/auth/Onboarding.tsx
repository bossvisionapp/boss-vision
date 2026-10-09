import { Check } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Select, cx } from '../../components/ui'
import { useStore } from '../../data/store'
import { CITIES, COMPANY_SIZES, EXPERIENCE_LABEL, FORMAT_LABEL, INDUSTRIES, NICHES, NICHE_RU, SKILLS, TURNOVERS } from '../../lib/format'
import type { Experience, WorkFormat } from '../../types'
import { AuthFrame } from './Splash'

const PROFESSIONS = [...NICHES, 'Другое']

/** ТЗ п.4 — онбординг кандидата: 11 шагов, по одному вопросу на экран (как в макете). */
export function OnboardingCandidate() {
  const { registerCandidate } = useStore()
  const nav = useNavigate()
  const [i, setI] = useState(1)
  const [err, setErr] = useState('')
  const [f, setF] = useState({
    name: '', phone: '+7 ', email: '', password: '', city: 'Алматы', age: '', experience: 'none' as Experience,
    profession: 'Business Assistant', other: '', skills: [] as string[], salary: '', format: 'hybrid' as WorkFormat, consent: false,
  })
  const set = (p: Partial<typeof f>) => {
    setF({ ...f, ...p })
    setErr('')
  }
  const N = 11

  const valid: Record<number, boolean> = {
    1: f.name.trim().split(' ').length >= 1 && f.name.trim().length > 1,
    2: f.phone.replace(/\D/g, '').length >= 11,
    3: /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 6,
    4: !!f.city,
    5: Number(f.age) >= 14 && Number(f.age) <= 70,
    6: true,
    7: f.profession !== 'Другое' || f.other.trim().length > 1,
    8: f.skills.length >= 1,
    9: true,
    10: true,
    11: f.consent,
  }

  const next = () => {
    if (!valid[i]) return setErr('Заполните поле, чтобы продолжить')
    if (i < N) return setI(i + 1)
    const category = f.profession === 'Другое' ? 'Business Assistant' : f.profession
    const e = registerCandidate(
      { name: f.name.trim(), phone: f.phone, email: f.email, password: f.password, city: f.city, age: Number(f.age), interests: [category] },
      {
        position: f.profession === 'Другое' ? f.other : NICHE_RU[f.profession],
        category,
        experience: f.experience,
        skills: f.skills,
        salary: f.salary ? Number(f.salary) : undefined,
        format: f.format,
        age: Number(f.age),
      },
    )
    if (e) return setErr(e)
    nav('/tests/mbti?first=1')
  }

  const titles: Record<number, [string, string]> = {
    1: ['Как вас зовут?', 'Имя и фамилия — как в резюме'],
    2: ['Ваш телефон', 'Работодатели свяжутся с вами по WhatsApp'],
    3: ['E-mail и пароль', 'Для входа и уведомлений'],
    4: ['Ваш город', 'Покажем вакансии рядом'],
    5: ['Сколько вам лет?', 'Возраст виден только в вашем профиле'],
    6: ['Опыт работы', 'Общий стаж'],
    7: ['Интересующая профессия', 'Можно поменять позже'],
    8: ['Ваши навыки', 'Выберите всё, что уже умеете'],
    9: ['Желаемая зарплата', 'В тенге, на руки'],
    10: ['Формат работы', 'Как вам удобнее'],
    11: ['Почти готово', 'Остался один шаг'],
  }

  return (
    <AuthFrame title={titles[i][0]} subtitle={titles[i][1]} step={{ i, n: N }}>
      <div className="space-y-3">
        {i === 1 && <Input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Алина Серикова" />}
        {i === 2 && <Input autoFocus inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+7 7__ ___ __ __" />}
        {i === 3 && (
          <>
            <Input autoFocus type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@mail.kz" />
            <Input type="password" value={f.password} onChange={(e) => set({ password: e.target.value })} placeholder="Пароль — минимум 6 символов" />
          </>
        )}
        {i === 4 && <Options value={f.city} onChange={(city) => set({ city })} options={CITIES.map((c) => [c, c])} />}
        {i === 5 && <Input autoFocus type="number" value={f.age} onChange={(e) => set({ age: e.target.value })} placeholder="24" />}
        {i === 6 && <Options value={f.experience} onChange={(experience) => set({ experience: experience as Experience })} options={Object.entries(EXPERIENCE_LABEL)} />}
        {i === 7 && (
          <>
            <Options value={f.profession} onChange={(profession) => set({ profession })} options={PROFESSIONS.map((p) => [p, p === 'Другое' ? 'Другое' : `${p} · ${NICHE_RU[p]}`])} />
            {f.profession === 'Другое' && <Input autoFocus value={f.other} onChange={(e) => set({ other: e.target.value })} placeholder="Ваша профессия" />}
          </>
        )}
        {i === 8 && (
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => {
              const on = f.skills.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ skills: on ? f.skills.filter((x) => x !== s) : [...f.skills, s] })}
                  className={cx('rounded-full border px-3.5 py-2 text-[13px] font-semibold transition', on ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-muted')}
                >
                  {s}
                </button>
              )
            })}
          </div>
        )}
        {i === 9 && <Input autoFocus type="number" value={f.salary} onChange={(e) => set({ salary: e.target.value })} placeholder="300000" />}
        {i === 10 && <Options value={f.format} onChange={(format) => set({ format: format as WorkFormat })} options={Object.entries(FORMAT_LABEL).map(([k, v]) => [k, { office: 'Офис (офлайн)', remote: 'Удалённо (онлайн)', hybrid: 'Гибрид' }[k] ?? v])} />}
        {i === 11 && (
          <>
            <Consent checked={f.consent} onChange={(consent) => set({ consent })} />
            <div className="rounded-2xl bg-surface-2 p-4 text-sm">
              <p className="font-semibold">Дальше — тест MBTI</p>
              <p className="mt-1 text-muted">Он обязателен для полного профиля: 20 вопросов, ~7 минут. Результат увидят работодатели, и AI будет точнее подбирать вакансии.</p>
            </div>
          </>
        )}
      </div>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
      <div className="mt-6 flex gap-2">
        {i > 1 && (
          <Button variant="secondary" size="lg" onClick={() => setI(i - 1)}>
            Назад
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={next} disabled={!valid[i]}>
          {i === N ? 'Создать профиль →' : 'Далее →'}
        </Button>
      </div>
    </AuthFrame>
  )
}

function Options({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-2">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cx('flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition', value === v ? 'border-accent bg-surface-2' : 'border-line bg-surface')}
        >
          {l}
          <span className={cx('flex h-5 w-5 items-center justify-center rounded-full border', value === v ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{value === v && <Check size={12} />}</span>
        </button>
      ))}
    </div>
  )
}

function Consent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--c-accent)]" />
      <span>
        Я согласен(на) с <u>Политикой конфиденциальности</u> и <u>Условиями использования</u> BOSS VISION и даю согласие на обработку персональных данных.
      </span>
    </label>
  )
}

/** ТЗ п.5 — регистрация предпринимателя с подтверждением телефона и e-mail */
export function RegisterEmployer() {
  const { registerEmployer } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', phone: '+7 ', email: '', password: '', company: '', employees: COMPANY_SIZES[1], industry: INDUSTRIES[0], city: 'Алматы', turnover: TURNOVERS[1], consent: false })
  const [codes, setCodes] = useState({ phoneSent: false, phone: '', emailSent: false, email: '' })
  const [err, setErr] = useState('')
  const phoneOk = codes.phone === '1234'
  const emailOk = codes.email === '1234'

  const submit = () => {
    if (!f.name || !f.company || f.password.length < 6) return setErr('Заполните имя, компанию и пароль (от 6 символов)')
    if (!phoneOk || !emailOk) return setErr('Подтвердите телефон и e-mail кодом')
    if (!f.consent) return setErr('Нужно согласие с политикой')
    const e = registerEmployer({ name: f.name, phone: f.phone, email: f.email, password: f.password, city: f.city }, { name: f.company, employees: f.employees, industry: f.industry, turnover: f.turnover })
    if (e) return setErr(e)
    nav('/employer')
  }

  return (
    <AuthFrame title="Регистрация компании" subtitle="Ищите сотрудников с AI-подбором и стройте команду">
      <div className="space-y-4">
        <Field label="Ваше имя">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Айгерим" />
        </Field>
        <Verify label="Телефон" value={f.phone} onChange={(phone) => setF({ ...f, phone })} sent={codes.phoneSent} onSend={() => setCodes({ ...codes, phoneSent: true })} code={codes.phone} onCode={(phone) => setCodes({ ...codes, phone })} ok={phoneOk} />
        <Verify label="E-mail" value={f.email} onChange={(email) => setF({ ...f, email })} sent={codes.emailSent} onSend={() => setCodes({ ...codes, emailSent: true })} code={codes.email} onCode={(email) => setCodes({ ...codes, email })} ok={emailOk} type="email" />
        <Field label="Пароль">
          <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Минимум 6 символов" />
        </Field>
        <Field label="Название компании">
          <Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="ТОО «…»" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сотрудников">
            <Select value={f.employees} onChange={(e) => setF({ ...f, employees: e.target.value })} options={COMPANY_SIZES.map((x) => ({ value: x, label: x }))} />
          </Field>
          <Field label="Город">
            <Select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={CITIES.map((x) => ({ value: x, label: x }))} />
          </Field>
        </div>
        <Field label="Сфера бизнеса">
          <Select value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} options={INDUSTRIES.map((x) => ({ value: x, label: x }))} />
        </Field>
        <Field label="Оборот компании в месяц">
          <Options value={f.turnover} onChange={(turnover) => setF({ ...f, turnover })} options={TURNOVERS.slice(1).map((t) => [t, t])} />
        </Field>
        <Consent checked={f.consent} onChange={(consent) => setF({ ...f, consent })} />
        {err && <p className="text-sm text-danger">{err}</p>}
        <Button size="lg" className="w-full" onClick={submit}>
          Создать кабинет
        </Button>
      </div>
    </AuthFrame>
  )
}

function Verify(p: { label: string; value: string; onChange: (v: string) => void; sent: boolean; onSend: () => void; code: string; onCode: (v: string) => void; ok: boolean; type?: string }): ReactNode {
  return (
    <Field label={p.label} hint={p.sent && !p.ok ? 'Демо: код подтверждения — 1234' : undefined}>
      <div className="flex gap-2">
        <Input type={p.type} value={p.value} onChange={(e) => p.onChange(e.target.value)} />
        {p.ok ? (
          <span className="flex shrink-0 items-center gap-1 rounded-2xl bg-success-soft px-3 text-sm font-semibold text-success">
            <Check size={16} /> Подтверждён
          </span>
        ) : (
          <Button variant="secondary" onClick={p.onSend} className="shrink-0">
            {p.sent ? 'Ещё раз' : 'Код'}
          </Button>
        )}
      </div>
      {p.sent && !p.ok && <Input className="mt-2" value={p.code} onChange={(e) => p.onCode(e.target.value)} placeholder="Код из SMS / письма" />}
    </Field>
  )
}
