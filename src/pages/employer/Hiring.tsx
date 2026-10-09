import { Check, ClipboardList, Lock, MessageCircle, Sparkles, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CandidateCard } from '../../components/cards'
import { Checkout, type CheckoutProduct } from '../../components/Checkout'
import { Badge, Button, Card, Chip, Empty, Field, Input, PageHeader, Search, Select, Tabs, Textarea, cx } from '../../components/ui'
import { hasBaseAccess, useMe, useStore } from '../../data/store'
import { vacancyFromText } from '../../lib/ai'
import { APP_STATUS_EMPLOYER, CITIES, EXPERIENCE_LABEL, FORMAT_LABEL, LANGUAGES, NICHES, NICHE_RU, daysLeft, money, timeAgo, waLink } from '../../lib/format'
import { interviewQuestions, matchScore, nicheRu } from '../../lib/match'
import type { ApplicationStatus, Vacancy } from '../../types'

/* ───────── ТЗ п.31 — отклики работодателя ───────── */

type Bucket = 'new' | 'viewed' | 'suitable' | 'interview' | 'offer' | 'hired' | 'rejected'
const BUCKET: Record<Bucket, ApplicationStatus[]> = { new: ['new'], viewed: ['viewed'], suitable: ['suitable'], interview: ['invited', 'interview'], offer: ['offer'], hired: ['hired'], rejected: ['rejected'] }
const BUCKET_LABEL: Record<Bucket, string> = { new: 'Новые', viewed: 'Просмотренные', suitable: 'Подходящие', interview: 'Собеседование', offer: 'Оффер', hired: 'Наняты', rejected: 'Отказ' }

export function Applicants({ embedded }: { embedded?: boolean }) {
  const { db, setAppStatus, openThread } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [vacId, setVacId] = useState(params.get('v') ?? '')
  const [bucket, setBucket] = useState<Bucket>('new')
  const myVacs = db.vacancies.filter((v) => v.ownerId === me.id)
  const all = db.applications.filter((a) => a.employerId === me.id && (!vacId || a.vacancyId === vacId))
  const list = all.filter((a) => BUCKET[bucket].includes(a.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div>
      {!embedded && <PageHeader title="Отклики" subtitle="Воронка найма по каждой вакансии" back />}
      <div className="mb-3 max-w-sm">
        <Select value={vacId} onChange={(e) => setVacId(e.target.value)} options={[{ value: '', label: 'Все вакансии' }, ...myVacs.map((v) => ({ value: v.id, label: v.title }))]} />
      </div>
      <Tabs tabs={(Object.keys(BUCKET) as Bucket[]).map((b) => ({ id: b, label: BUCKET_LABEL[b], count: all.filter((a) => BUCKET[b].includes(a.status)).length }))} value={bucket} onChange={setBucket} />
      <div className="space-y-3">
        {list.map((a) => {
          const r = db.resumes.find((x) => x.id === a.resumeId)
          const v = db.vacancies.find((x) => x.id === a.vacancyId)
          const u = db.users.find((x) => x.id === a.candidateId)
          if (!r || !v) return null
          const m = matchScore(v, r, u, db.settings.weights)
          const go = (s: ApplicationStatus) => setAppStatus(a.id, s)
          return (
            <div key={a.id}>
              <p className="mb-1 px-1 text-xs text-muted">на «{v.title}» · {timeAgo(a.createdAt)} {a.source === 'invite' && '· приглашён вами'}</p>
              <CandidateCard
                r={r}
                match={m}
                detailed
                action={
                  <>
                    {a.coverLetter && <p className="mb-1 w-full whitespace-pre-line rounded-2xl bg-surface-2 p-3 text-sm italic">«{a.coverLetter}»</p>}
                    <Button size="sm" variant="secondary" onClick={() => { if (a.status === 'new') go('viewed'); nav(`/resumes/${r.id}`) }}>Резюме</Button>
                    {['new', 'viewed'].includes(a.status) && <Button size="sm" variant="soft" onClick={() => go('suitable')}>Подходит</Button>}
                    {['new', 'viewed', 'suitable'].includes(a.status) && <Button size="sm" onClick={() => { go('interview'); nav(`/chats/${openThread(a.candidateId, v.title, v.id)}`) }}>На собеседование</Button>}
                    {['invited', 'interview'].includes(a.status) && <Button size="sm" variant="gold" onClick={() => go('offer')}>Сделать оффер</Button>}
                    {a.status === 'offer' && <Button size="sm" variant="gold" onClick={() => go('hired')}>Нанять 🏆</Button>}
                    {!['hired', 'rejected'].includes(a.status) && <Button size="sm" variant="danger" onClick={() => go('rejected')}>Отказ</Button>}
                    <Button size="sm" variant="ghost" onClick={() => nav(`/chats/${openThread(a.candidateId, v.title, v.id)}`)}><MessageCircle size={14} /> Чат</Button>
                  </>
                }
              />
            </div>
          )
        })}
      </div>
      {list.length === 0 && <Empty icon={<ClipboardList />} title={`${BUCKET_LABEL[bucket]}: пусто`} text="Попробуйте AI-подбор — он найдёт кандидатов в базе" action={<Button onClick={() => nav('/employer/ai-match')}>AI-подбор</Button>} />}
    </div>
  )
}

/* ───────── ТЗ п.32–33 — AI-подбор кандидатов ───────── */

export function AiMatch({ embedded }: { embedded?: boolean }) {
  const { db, bumpStat, update } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const myVacs = db.vacancies.filter((v) => v.ownerId === me.id && v.status === 'active')
  const [mode, setMode] = useState<'vacancy' | 'text'>(params.get('v') || myVacs.length ? 'vacancy' : 'text')
  const [vacId, setVacId] = useState(params.get('v') ?? myVacs[0]?.id ?? '')
  const [text, setText] = useState('Мне нужен бизнес-ассистент, Алматы, до 250 000 ₸, Canva, календарь, коммуникация с клиентами.')
  const [target, setTarget] = useState<Vacancy | null>(null)
  const [loading, setLoading] = useState(false)

  const results = useMemo(() => {
    if (!target) return []
    return db.resumes
      .filter((r) => r.visible && !r.hiddenByAdmin)
      .map((r) => ({ r, m: matchScore(target, r, db.users.find((u) => u.id === r.userId), db.settings.weights) }))
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 10)
  }, [target, db])

  const run = () => {
    let v: Vacancy | undefined
    if (mode === 'vacancy') v = myVacs.find((x) => x.id === vacId)
    else {
      const d = vacancyFromText(text)
      v = { id: 'query', companyId: '', ownerId: me.id, title: d.title, category: d.category, city: d.city, format: d.format, employment: 'full', experience: 'none', schedule: '5/2', languages: [], skills: d.skills, description: text, duties: d.duties, requirements: [], extra: '', contactName: '', contactPhone: '', whatsapp: '', contactEmail: '', status: 'active', tariff: 'standard', views: 0, saves: 0, createdAt: '', salaryFrom: d.salaryFrom, salaryTo: d.salaryTo }
    }
    if (!v) return
    setLoading(true)
    setTarget(null)
    bumpStat('aiMatchRuns')
    setTimeout(() => {
      setTarget(v!)
      setLoading(false)
      update((d) => ({ ...d, notifications: [{ id: `nt_${Date.now()}`, userId: me.id, text: `AI нашёл кандидатов: «${v!.title}»`, link: '/employer/ai-match', read: true, createdAt: new Date().toISOString() }, ...d.notifications] }))
    }, 1100)
  }

  return (
    <div>
      {!embedded && <PageHeader title="AI-подбор кандидатов" subtitle="Одна из главных функций BOSS VISION" back />}
      <div className="rounded-[30px] bg-hero p-5 text-on-hero lux-grain sm:p-6">
        <div className="mb-3 inline-grid grid-cols-2 rounded-2xl bg-white/10 p-1 text-sm font-semibold">
          {(['vacancy', 'text'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cx('rounded-xl px-3 py-1.5', mode === m ? 'bg-white text-[#1e1a16]' : 'opacity-75')}>
              {m === 'vacancy' ? 'По вакансии' : 'Своими словами'}
            </button>
          ))}
        </div>
        {mode === 'vacancy' ? (
          myVacs.length ? (
            <select value={vacId} onChange={(e) => setVacId(e.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-sm [&>option]:text-black">
              {myVacs.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
            </select>
          ) : (
            <p className="text-sm opacity-75">Нет активных вакансий — опишите задачу своими словами.</p>
          )
        ) : (
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-24 w-full rounded-2xl border border-white/15 bg-white/10 p-3 text-sm outline-none" />
        )}
        <p className="mt-3 text-sm opacity-70">AI анализирует более 50 параметров: навыки, опыт, зарплату, город, формат и личность (MBTI, Gallup)</p>
        <Button variant="gold" size="lg" className="mt-4 w-full sm:w-auto" onClick={run} disabled={loading}>
          <Sparkles size={17} /> {loading ? 'Анализируем базу…' : 'Запустить подбор'}
        </Button>
      </div>

      {loading && <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-surface-2" />)}</div>}

      {target && (
        <div className="mt-6">
          <p className="mb-1 font-display text-xl font-semibold">TOP {results.length} CANDIDATES</p>
          <p className="mb-4 text-sm text-muted">Под «{target.title}» · {nicheRu(target.category)} · {target.city}</p>
          <div className="space-y-4">
            {results.map(({ r, m }, i) => (
              <div key={r.id}>
                <p className="mb-1 px-1 text-xs font-bold text-gold">#{i + 1}</p>
                <CandidateCard
                  r={r}
                  match={m}
                  detailed
                  action={
                    <div className="w-full space-y-3">
                      <div className="rounded-2xl border border-line p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted">На собеседовании спросить</p>
                        <ul className="mt-1 space-y-0.5 text-sm">{interviewQuestions(target, m).map((q) => <li key={q}>• {q}</li>)}</ul>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => nav(`/resumes/${r.id}`)}>Открыть и пригласить</Button>
                      </div>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── ТЗ п.34–37 — база резюме с доступом по нишам ───────── */

export function Base({ embedded }: { embedded?: boolean }) {
  const { db } = useStore()
  const me = useMe()
  const [params] = useSearchParams()
  const [niche, setNiche] = useState(params.get('niche') ?? '')
  const [q, setQ] = useState('')
  const [f, setF] = useState({ city: '', experience: '', salary: '', language: '', format: '' })
  const [pay, setPay] = useState<CheckoutProduct | null>(null)
  const prices = db.settings.prices.base

  const list = db.resumes
    .filter((r) => r.visible && !r.hiddenByAdmin)
    .filter((r) => !niche || r.category === niche)
    .filter((r) => !f.city || r.city === f.city)
    .filter((r) => !f.experience || r.experience === f.experience)
    .filter((r) => !f.salary || (r.salary ?? 0) <= Number(f.salary))
    .filter((r) => !f.language || r.languages.some((l) => l.name === f.language))
    .filter((r) => !f.format || r.format === f.format)
    .filter((r) => !q || [r.position, r.about, ...r.skills, ...r.tools].join(' ').toLowerCase().includes(q.toLowerCase()))

  const access = niche ? hasBaseAccess(me, niche) : false
  const access2 = me.baseAccess.find((a) => a.niche === niche)

  return (
    <div>
      {!embedded && <PageHeader title="База резюме" subtitle="CANDIDATE DATABASE · доступ по нишам" back />}
      <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        <Chip active={!niche} onClick={() => setNiche('')}>Все ниши</Chip>
        {NICHES.map((n) => (
          <Chip key={n} active={niche === n} onClick={() => setNiche(n)}>
            {hasBaseAccess(me, n) && '✓ '}{NICHE_RU[n]} · {db.resumes.filter((r) => r.visible && r.category === n).length}
          </Chip>
        ))}
      </div>

      {niche && (
        <Card className={cx('mb-4', access ? 'border-success/40' : 'border-gold/50')}>
          {access ? (
            <p className="flex items-center gap-2 text-sm"><Check size={17} className="text-success" /> Доступ к нише «{NICHE_RU[niche]}» активен ещё <b>{daysLeft(access2?.until)} дн.</b> — контакты, портфолио, сертификаты и тесты открыты.</p>
          ) : (
            <div>
              <p className="flex items-center gap-2 font-semibold"><Lock size={16} className="text-gold" /> Контакты «{NICHE_RU[niche]}» скрыты</p>
              <p className="mt-1 text-sm text-muted">До покупки видны имя, город, опыт, навыки, ожидания и Match %. После — телефон, WhatsApp, email, полное резюме, портфолио, сертификаты и тесты.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => setPay({ type: 'base', label: `База резюме — ${niche}, 1 месяц`, amount: prices.month, meta: { niche, period: 'month' } })}>1 ниша / 1 месяц — {money(prices.month)}</Button>
                <Button variant="gold" onClick={() => setPay({ type: 'base', label: `База резюме — ${niche}, 1 год`, amount: prices.year, meta: { niche, period: 'year' } })}>1 ниша / 1 год — {money(prices.year)}</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Search value={q} onChange={setQ} placeholder="Навык, инструмент, должность…" />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={[{ value: '', label: 'Город' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
        <Select value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} options={[{ value: '', label: 'Опыт' }, ...Object.entries(EXPERIENCE_LABEL).map(([value, label]) => ({ value, label }))]} />
        <Input type="number" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} placeholder="Зарплата до" />
        <Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} options={[{ value: '', label: 'Язык' }, ...LANGUAGES.map((c) => ({ value: c, label: c }))]} />
        <Select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} options={[{ value: '', label: 'Формат' }, ...Object.entries(FORMAT_LABEL).map(([value, label]) => ({ value, label }))]} />
      </div>
      <div className="mt-4 space-y-3">{list.map((r) => <CandidateCard key={r.id} r={r} />)}</div>
      {list.length === 0 && <Empty icon={<Users />} title="Никого не нашли" text="Измените фильтры" />}
      <Checkout open={!!pay} product={pay} onClose={() => setPay(null)} />
    </div>
  )
}

/** Вкладка «Кандидаты» нижней навигации предпринимателя: AI-подбор · База · Отклики */
export function Candidates() {
  const [tab, setTab] = useState<'ai' | 'base' | 'apps'>('ai')
  return (
    <div>
      <PageHeader title="Кандидаты" />
      <Tabs tabs={[{ id: 'ai', label: 'AI-подбор' }, { id: 'base', label: 'База резюме' }, { id: 'apps', label: 'Отклики' }]} value={tab} onChange={setTab} />
      {tab === 'ai' && <AiMatch embedded />}
      {tab === 'base' && <Base embedded />}
      {tab === 'apps' && <Applicants embedded />}
    </div>
  )
}

/* ───────── ТЗ п.38 — подбор под ключ ───────── */

export function Recruitment() {
  const { db, createLead } = useStore()
  const me = useMe()
  const company = db.companies.find((c) => c.id === me.companyId)
  const p = db.settings.prices.recruitment
  const [sent, setSent] = useState('')
  const plans = [
    { id: 'basic', name: 'Базовый', price: p.basic, items: ['Составление вакансии', 'Размещение', 'Первичный отбор', '5–7 кандидатов', '2 финалиста'] },
    { id: 'standard', name: 'Стандарт', price: p.standard, items: ['Всё из Базового', 'Собеседования', 'Тестовое задание', '3–5 финалистов', 'Регламент работы', 'Замена кандидата 30 дней', 'Обучение навыкам'], hot: true },
    { id: 'premium', name: 'Premium', price: p.premium, items: ['Глубокий анализ бизнеса', 'Должностная инструкция', 'Помощь с системой', 'Адаптация и обучение', 'Регламент', 'Сопровождение 2 месяца'] },
  ]
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Подбор под ключ" subtitle="RECRUITMENT · команда BOSS VISION найдёт, отберёт и обучит сотрудника. 100+ предпринимателей уже доверили нам подбор" back />
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted">
        {['Разбор резюме', 'Тестирование', 'Интервью с Анар', 'Финальное интервью с вами', 'Выход на работу'].map((s, i) => (
          <span key={s} className="flex items-center gap-2">{i > 0 && <span className="text-gold">→</span>}<span className="rounded-full border border-line px-3 py-1">{s}</span></span>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((pl) => {
          const msg = `Здравствуйте! Хочу подбор под ключ, тариф «${pl.name}» (${money(pl.price)}). Компания: ${company?.name ?? '—'}. Имя: ${me.name}, телефон: ${me.phone}.`
          return (
            <div key={pl.id} className={cx('flex flex-col rounded-[28px] border p-5', pl.hot ? 'border-gold bg-hero text-on-hero lux-grain' : 'border-line bg-surface')}>
              {pl.hot && <Badge tone="warn" className="mb-2 w-fit">★ Самый популярный</Badge>}
              <p className="font-display text-xl font-semibold">{pl.name}</p>
              <p className="mt-1 font-display text-3xl font-semibold">{money(pl.price)}</p>
              <ul className={cx('mt-4 flex-1 space-y-1.5 text-sm', pl.hot ? 'opacity-90' : 'text-muted')}>{pl.items.map((x) => <li key={x} className="flex gap-2"><Check size={16} className="shrink-0 text-gold" /> {x}</li>)}</ul>
              <a
                href={waLink(db.settings.whatsapp, msg)}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  createLead({ type: 'recruitment', userId: me.id, name: me.name, company: company?.name ?? '', phone: me.phone, details: msg, tariff: `${pl.name} — ${money(pl.price)}` })
                  setSent(pl.name)
                }}
                className={cx('mt-5 inline-flex h-12 items-center justify-center rounded-2xl text-sm font-semibold', pl.hot ? 'bg-gold text-white' : 'bg-accent text-on-accent')}
              >
                Оставить заявку в WhatsApp
              </a>
            </div>
          )
        })}
      </div>
      {sent && <p className="mt-4 rounded-2xl bg-success-soft p-3 text-sm text-success">Заявка «{sent}» сохранена — команда BOSS VISION свяжется с вами. Сообщение в WhatsApp сформировано автоматически.</p>}
    </div>
  )
}

/* ───────── ТЗ п.39 — кадровая подписка ───────── */

export function Subscription() {
  const { db, createLead } = useStore()
  const me = useMe()
  const company = db.companies.find((c) => c.id === me.companyId)
  const [f, setF] = useState({ name: me.name, company: company?.name ?? '', phone: me.phone, count: '3', niche: 'Business Assistant' })
  const [sent, setSent] = useState(false)
  const msg = `Кадровая подписка BOSS VISION. ${f.name}, ${f.company}, ${f.phone}. Нужно нанять: ${f.count} чел., ниша: ${NICHE_RU[f.niche]}.`
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Кадровая подписка" subtitle="Регулярный найм под ваш рост: мы закрываем вакансии весь год по фиксированной подписке" back />
      <Card className="space-y-3 p-5">
        <Field label="Имя"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Компания"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
        <Field label="Телефон"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сколько нанять"><Input type="number" value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} /></Field>
          <Field label="Ниша"><Select value={f.niche} onChange={(e) => setF({ ...f, niche: e.target.value })} options={NICHES.map((n) => ({ value: n, label: NICHE_RU[n] }))} /></Field>
        </div>
        {sent ? (
          <p className="rounded-2xl bg-success-soft p-3 text-sm text-success">Заявка отправлена в CRM BOSS VISION ✓</p>
        ) : (
          <a
            href={waLink(db.settings.whatsapp, msg)}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              createLead({ type: 'subscription', userId: me.id, name: f.name, company: f.company, phone: f.phone, details: msg })
              setSent(true)
            }}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-on-accent"
          >
            Узнать подробнее
          </a>
        )}
        <Textarea readOnly value={msg} className="!min-h-0 text-xs text-muted" rows={3} />
      </Card>
      <p className="mt-3 text-center text-xs text-muted"><Link to="/employer/recruitment" className="underline">Или разовый подбор под ключ →</Link></p>
    </div>
  )
}
