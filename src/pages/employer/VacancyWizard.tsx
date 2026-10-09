import { Check, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Checkout } from '../../components/Checkout'
import { Badge, Button, Card, Field, Input, PageHeader, Select, TagEditor, Textarea, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { vacancyFromText, type VacancyDraft } from '../../lib/ai'
import { CITIES, EMPLOYMENT_LABEL, EXPERIENCE_LABEL, FORMAT_LABEL, LANGUAGES, NICHES, NICHE_RU, SCHEDULE_LABEL, SKILLS, TARIFF_INFO, money, salaryRange, uid } from '../../lib/format'
import type { Vacancy, VacancyTariff } from '../../types'

const opts = (rec: Record<string, string>) => Object.entries(rec).map(([value, label]) => ({ value, label }))
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** ТЗ п.26–29: тариф → форма (или «через AI») → предпросмотр → оплата → публикация */
export default function VacancyWizard() {
  const { id } = useParams()
  const { db, saveVacancy, bumpStat } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const existing = db.vacancies.find((v) => v.id === id && v.ownerId === me.id)
  const company = db.companies.find((c) => c.id === me.companyId)
  const isNew = !existing || existing.status === 'draft'
  const [step, setStep] = useState<'tariff' | 'form' | 'preview'>(existing ? 'form' : 'tariff')
  const [v, setV] = useState<Vacancy>(
    existing ?? {
      id: uid('v'), companyId: me.companyId ?? '', ownerId: me.id, title: '', category: 'Business Assistant', city: me.city, format: 'hybrid', employment: 'full',
      experience: '1-3', schedule: '5/2', languages: ['Русский'], skills: [], description: '', duties: [], requirements: [], extra: '', contactName: me.name,
      contactPhone: me.phone, whatsapp: me.phone, contactEmail: me.email, status: 'draft', tariff: 'premium', views: 0, saves: 0, createdAt: new Date().toISOString(),
    },
  )
  const [duties, setDuties] = useState(v.duties.join('\n'))
  const [reqs, setReqs] = useState(v.requirements.join('\n'))
  const [aiText, setAiText] = useState('')
  const [draft, setDraft] = useState<VacancyDraft | null>(null)
  const [pay, setPay] = useState(false)
  const set = (p: Partial<Vacancy>) => setV({ ...v, ...p })
  const final = (): Vacancy => ({ ...v, companyId: me.companyId ?? v.companyId, duties: lines(duties), requirements: lines(reqs) })
  const prices = db.settings.prices.vacancy

  const runAi = () => {
    const d = vacancyFromText(aiText)
    bumpStat('aiVacancyRuns')
    setDraft(d)
    setV({ ...v, title: d.title, category: d.category, city: d.city, format: d.format, salaryFrom: d.salaryFrom, salaryTo: d.salaryTo, skills: d.skills, description: aiText.trim() })
    setDuties(d.duties.join('\n'))
    setReqs(d.requirements.join('\n'))
  }

  if (!company) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="font-semibold">Сначала добавьте компанию</p>
        <Button className="mt-3" onClick={() => nav('/profile')}>В профиль</Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={existing && !isNew ? 'Редактирование вакансии' : 'Новая вакансия'} back />
      {isNew && (
        <div className="mb-5 flex gap-1.5">
          {['Тариф', 'Вакансия', 'Предпросмотр', 'Оплата'].map((s, i) => {
            const cur = ['tariff', 'form', 'preview'].indexOf(step)
            return (
              <div key={s} className="flex-1">
                <div className={cx('h-1 rounded-full', i <= cur ? 'bg-gold' : 'bg-line')} />
                <p className={cx('mt-1 text-[11px]', i <= cur ? 'font-semibold' : 'text-muted')}>{s}</p>
              </div>
            )
          })}
        </div>
      )}

      {step === 'tariff' && (
        <div className="space-y-3">
          {(Object.keys(TARIFF_INFO) as VacancyTariff[]).map((t) => (
            <button key={t} type="button" onClick={() => set({ tariff: t })} className={cx('w-full rounded-[26px] border-2 p-5 text-left transition', v.tariff === t ? 'border-gold bg-surface' : 'border-line bg-surface')}>
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-semibold tracking-wide">{TARIFF_INFO[t].label}</p>
                <p className="font-display text-2xl font-semibold">{money(prices[t])}</p>
              </div>
              <ul className="mt-2 space-y-1">{TARIFF_INFO[t].perks.map((p) => <li key={p} className="flex gap-2 text-sm text-muted"><Check size={16} className="text-gold" /> {p}</li>)}</ul>
              {t === 'premium' && <Badge tone="warn" className="mt-2">Выбирают чаще всего</Badge>}
            </button>
          ))}
          <Button size="lg" className="w-full" onClick={() => setStep('form')}>Далее</Button>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-4">
          <div className="rounded-[26px] bg-hero p-5 text-on-hero lux-grain">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles size={18} className="text-gold" /> Создать вакансию через AI</p>
            <p className="mt-1 text-sm opacity-75">Напишите обычными словами — AI заполнит название, обязанности, требования, навыки, формат и посоветует зарплату</p>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Мне нужен ассистент в Алматы до 250 000 ₸. Нужно вести календарь, отвечать клиентам, работать в Canva и помогать с контентом."
              className="mt-3 min-h-24 w-full rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-inherit outline-none placeholder:text-white/45"
            />
            <Button variant="gold" className="mt-2" disabled={aiText.trim().length < 15} onClick={runAi}>
              <Wand2 size={16} /> Сгенерировать
            </Button>
            {draft && (
              <div className="mt-4 space-y-2 rounded-2xl bg-white/[.08] p-4 text-sm">
                <p>✓ Форма заполнена — проверьте и измените при необходимости.</p>
                <p className="opacity-85">💰 {draft.salaryAdvice}</p>
                <p className="font-semibold">Дополнительные вопросы к вам:</p>
                <ul className="opacity-80">{draft.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
              </div>
            )}
          </div>

          <Card className="space-y-3 p-5">
            <Field label="Название"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Бизнес-ассистент" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Компания"><Input value={company.name} disabled /></Field>
              <Field label="Ниша"><Select value={v.category} onChange={(e) => set({ category: e.target.value })} options={NICHES.map((n) => ({ value: n, label: NICHE_RU[n] }))} /></Field>
              <Field label="Город"><Select value={v.city} onChange={(e) => set({ city: e.target.value })} options={CITIES.map((c) => ({ value: c, label: c }))} /></Field>
              <Field label="Формат"><Select value={v.format} onChange={(e) => set({ format: e.target.value as Vacancy['format'] })} options={opts(FORMAT_LABEL)} /></Field>
              <Field label="Тип занятости"><Select value={v.employment} onChange={(e) => set({ employment: e.target.value as Vacancy['employment'] })} options={opts(EMPLOYMENT_LABEL)} /></Field>
              <Field label="Опыт"><Select value={v.experience} onChange={(e) => set({ experience: e.target.value as Vacancy['experience'] })} options={opts(EXPERIENCE_LABEL)} /></Field>
              <Field label="Зарплата от, ₸"><Input type="number" value={v.salaryFrom ?? ''} onChange={(e) => set({ salaryFrom: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Зарплата до, ₸"><Input type="number" value={v.salaryTo ?? ''} onChange={(e) => set({ salaryTo: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="График"><Select value={v.schedule} onChange={(e) => set({ schedule: e.target.value as Vacancy['schedule'] })} options={opts(SCHEDULE_LABEL)} /></Field>
              <Field label="Дата начала"><Input type="date" value={v.startDate?.slice(0, 10) ?? ''} onChange={(e) => set({ startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
            </div>
            <Field label="Языки">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => {
                  const on = v.languages.includes(l)
                  return <button key={l} type="button" onClick={() => set({ languages: on ? v.languages.filter((x) => x !== l) : [...v.languages, l] })} className={cx('rounded-full border px-3 py-1.5 text-sm', on ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{l}</button>
                })}
              </div>
            </Field>
            <Field label="Описание"><Textarea value={v.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Обязанности" hint="Каждая с новой строки"><Textarea value={duties} onChange={(e) => setDuties(e.target.value)} /></Field>
              <Field label="Требования" hint="Каждое с новой строки"><Textarea value={reqs} onChange={(e) => setReqs(e.target.value)} /></Field>
            </div>
            <Field label="Навыки" hint="По ним работает AI Matching"><TagEditor value={v.skills} onChange={(skills) => set({ skills })} suggestions={SKILLS} /></Field>
            <Field label="Дополнительные пожелания"><Textarea value={v.extra} onChange={(e) => set({ extra: e.target.value })} className="!min-h-20" /></Field>
          </Card>

          <Card className="space-y-3 p-5">
            <p className="font-display text-lg font-semibold">Контакты</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Контактное лицо"><Input value={v.contactName} onChange={(e) => set({ contactName: e.target.value })} /></Field>
              <Field label="Телефон"><Input value={v.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} /></Field>
              <Field label="WhatsApp"><Input value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
              <Field label="Email"><Input value={v.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} /></Field>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            {isNew && (
              <Button variant="secondary" onClick={() => { saveVacancy({ ...final(), status: 'draft' }); nav('/employer/vacancies') }}>
                Сохранить черновик
              </Button>
            )}
            <Button size="lg" className="flex-1" disabled={!v.title || !v.description} onClick={() => setStep('preview')}>
              Предпросмотр →
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <Card className="p-5">
            <Badge tone="dark">{TARIFF_INFO[v.tariff].label}</Badge>
            <h2 className="mt-2 font-display text-2xl font-semibold">{v.title}</h2>
            <p className="text-sm text-muted">{company.name} · {v.city} · {FORMAT_LABEL[v.format]} · {EMPLOYMENT_LABEL[v.employment]}</p>
            <p className="mt-2 font-semibold">{salaryRange(v.salaryFrom, v.salaryTo)}</p>
            <p className="mt-3 whitespace-pre-line text-sm">{v.description}</p>
            <p className="mt-3 text-sm font-semibold">Обязанности</p>
            <ul className="text-sm text-muted">{lines(duties).map((d) => <li key={d}>• {d}</li>)}</ul>
            <p className="mt-3 text-sm font-semibold">Требования</p>
            <ul className="text-sm text-muted">{lines(reqs).map((d) => <li key={d}>• {d}</li>)}</ul>
            <div className="mt-3 flex flex-wrap gap-1.5">{v.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('form')}>Изменить</Button>
            {isNew ? (
              <Button size="lg" className="flex-1" onClick={() => { saveVacancy({ ...final(), status: 'draft' }); setPay(true) }}>
                Оплатить {money(prices[v.tariff])} и опубликовать
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1"
                onClick={() => {
                  saveVacancy({ ...final(), status: db.settings.premoderation ? 'moderation' : existing!.status })
                  nav('/employer/vacancies')
                }}
              >
                Сохранить изменения
              </Button>
            )}
          </div>
        </div>
      )}

      <Checkout
        open={pay}
        onClose={() => setPay(false)}
        product={{ type: 'vacancy', refId: v.id, label: `Вакансия ${TARIFF_INFO[v.tariff].label} — ${v.title}`, amount: prices[v.tariff] }}
        onPaid={() => nav('/employer/vacancies')}
      />
    </div>
  )
}
