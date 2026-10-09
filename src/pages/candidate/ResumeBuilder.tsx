import { Camera, Download, Eye, EyeOff, Plus, Send, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Button, Card, Field, Input, Modal, PageHeader, Select, TagEditor, Textarea, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { adaptResume, coverLetter, improveText, structureText } from '../../lib/ai'
import { CITIES, EMPLOYMENT_LABEL, EXPERIENCE_LABEL, FORMAT_LABEL, LANGUAGES, LANG_LEVELS, NICHES, NICHE_RU, SKILLS, TOOLS, resizeImage, uid } from '../../lib/format'
import type { Resume } from '../../types'

const opts = (rec: Record<string, string>) => Object.entries(rec).map(([value, label]) => ({ value, label }))

/** ТЗ п.17 — конструктор резюме + AI Resume */
export default function ResumeBuilder() {
  const { db, saveResume, updateMe, bumpStat } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const existing = db.resumes.find((r) => r.userId === me.id)
  const [r, setR] = useState<Resume>(
    existing ?? {
      id: uid('r'), userId: me.id, fullName: me.name, position: '', category: 'Business Assistant', city: me.city, age: me.age, phone: me.phone, email: me.email,
      telegram: '', whatsapp: me.phone, goal: '', about: '', format: 'hybrid', employment: 'full', experience: 'none', skills: [], tools: [],
      languages: [{ name: 'Русский', level: 'Родной' }], work: [], education: [], portfolio: [], visible: true, updatedAt: new Date().toISOString(),
    },
  )
  const [saved, setSaved] = useState(false)
  const [forVac, setForVac] = useState(params.get('for') ?? '')
  const [aiNote, setAiNote] = useState('')
  const [send, setSend] = useState(false)
  const set = (p: Partial<Resume>) => {
    setR({ ...r, ...p })
    setSaved(false)
  }
  const save = () => {
    saveResume(r)
    if (r.photo && !me.avatar) updateMe({ avatar: r.photo })
    setSaved(true)
  }
  const ai = (label: string, fn: () => void) => {
    fn()
    bumpStat('aiResumeRuns')
    setAiNote(label)
    setTimeout(() => setAiNote(''), 2500)
  }
  const vacancies = db.vacancies.filter((v) => v.status === 'active')
  const targetVac = vacancies.find((v) => v.id === forVac)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Конструктор резюме"
        subtitle="Заполните разделы — AI поможет улучшить текст и адаптировать под вакансию"
        back
        action={
          <button type="button" onClick={() => set({ visible: !r.visible })} className={cx('flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-semibold', r.visible ? 'bg-success-soft text-success' : 'bg-surface-2 text-muted')}>
            {r.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            {r.visible ? 'Видно работодателям' : 'Скрыто'}
          </button>
        }
      />

      {/* AI Resume */}
      <div className="sticky top-[60px] z-20 mb-4 rounded-3xl bg-hero p-4 text-on-hero shadow-lg lux-grain">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 font-display text-lg font-semibold">
            <Sparkles size={18} className="text-gold" /> AI Resume
          </span>
          <AiBtn onClick={() => ai('Текст улучшен', () => set({ about: improveText(r.about), goal: improveText(r.goal) }))}>Улучшить текст</AiBtn>
          <AiBtn onClick={() => ai('Ошибки исправлены', () => set({ about: improveText(r.about), work: r.work.map((w) => ({ ...w, duties: improveText(w.duties), achievements: improveText(w.achievements) })) }))}>Исправить ошибки</AiBtn>
          <AiBtn onClick={() => ai('Опыт структурирован', () => set({ work: r.work.map((w) => ({ ...w, duties: structureText(w.duties) })) }))}>Структурировать опыт</AiBtn>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={forVac} onChange={(e) => setForVac(e.target.value)} className="h-9 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-inherit [&>option]:text-black">
            <option value="">Выберите вакансию для адаптации…</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} — {db.companies.find((c) => c.id === v.companyId)?.name}
              </option>
            ))}
          </select>
          <AiBtn disabled={!targetVac} onClick={() => targetVac && ai(`Резюме адаптировано под «${targetVac.title}»`, () => setR(adaptResume(r, targetVac)))}>
            <Wand2 size={14} /> Адаптировать
          </AiBtn>
        </div>
        {aiNote && <p className="mt-2 text-sm text-gold">✓ {aiNote}</p>}
      </div>

      <div className="space-y-4">
        <Section title="Основное">
          <div className="flex items-center gap-4">
            <Avatar name={r.fullName || '?'} color={me.avatarColor} photo={r.photo} size={76} ring />
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold">
                <Camera size={16} /> {r.photo ? 'Заменить фото' : 'Загрузить фото'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => e.target.files?.[0] && set({ photo: await resizeImage(e.target.files[0]) })} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ФИО"><Input value={r.fullName} onChange={(e) => set({ fullName: e.target.value })} /></Field>
            <Field label="Профессия / должность"><Input value={r.position} onChange={(e) => set({ position: e.target.value })} placeholder="Бизнес-ассистент" /></Field>
            <Field label="Ниша"><Select value={r.category} onChange={(e) => set({ category: e.target.value })} options={NICHES.map((n) => ({ value: n, label: `${n} · ${NICHE_RU[n]}` }))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Город"><Select value={r.city} onChange={(e) => set({ city: e.target.value })} options={CITIES.map((c) => ({ value: c, label: c }))} /></Field>
              <Field label="Возраст"><Input type="number" value={r.age ?? ''} onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            </div>
          </div>
        </Section>

        <Section title="Контакты" hint="Работодатель увидит их после покупки доступа к базе или после вашего отклика">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Телефон"><Input value={r.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={r.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Telegram"><Input value={r.telegram} onChange={(e) => set({ telegram: e.target.value })} placeholder="@username" /></Field>
            <Field label="WhatsApp"><Input value={r.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
          </div>
        </Section>

        <Section title="Цель и обо мне">
          <Field label="Цель"><Input value={r.goal} onChange={(e) => set({ goal: e.target.value })} placeholder="Вырасти до операционного менеджера" /></Field>
          <Field label="Обо мне"><Textarea value={r.about} onChange={(e) => set({ about: e.target.value })} placeholder="Организованный и проактивный…" /></Field>
        </Section>

        <Section title="Опыт работы">
          <Field label="Общий опыт">
            <Select value={r.experience} onChange={(e) => set({ experience: e.target.value as Resume['experience'] })} options={opts(EXPERIENCE_LABEL)} />
          </Field>
          {r.work.map((w, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-line p-3">
              <div className="flex justify-between">
                <p className="text-sm font-semibold">Место работы {i + 1}</p>
                <button type="button" onClick={() => set({ work: r.work.filter((_, j) => j !== i) })} className="text-muted hover:text-danger" aria-label="Удалить">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['company', 'position', 'period'] as const).map((k) => (
                  <Input key={k} value={w[k]} placeholder={{ company: 'Компания', position: 'Должность', period: '2023 — н.в.' }[k]} onChange={(e) => set({ work: r.work.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} />
                ))}
              </div>
              <Textarea value={w.duties} placeholder="Обязанности" onChange={(e) => set({ work: r.work.map((x, j) => (j === i ? { ...x, duties: e.target.value } : x)) })} />
              <Input value={w.achievements} placeholder="Достижения в цифрах: сократила время отчётов на 40%" onChange={(e) => set({ work: r.work.map((x, j) => (j === i ? { ...x, achievements: e.target.value } : x)) })} />
            </div>
          ))}
          <Button variant="secondary" onClick={() => set({ work: [...r.work, { company: '', position: '', period: '', duties: '', achievements: '' }] })}>
            <Plus size={16} /> Добавить место работы
          </Button>
        </Section>

        <Section title="Образование">
          {r.education.map((ed, i) => (
            <div key={i} className="flex gap-2">
              <Input value={ed.place} placeholder="Учебное заведение" onChange={(e) => set({ education: r.education.map((x, j) => (j === i ? { ...x, place: e.target.value } : x)) })} />
              <Input value={ed.specialty} placeholder="Специальность" onChange={(e) => set({ education: r.education.map((x, j) => (j === i ? { ...x, specialty: e.target.value } : x)) })} />
              <Input className="!w-24" value={ed.year} placeholder="Год" onChange={(e) => set({ education: r.education.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)) })} />
              <button type="button" onClick={() => set({ education: r.education.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => set({ education: [...r.education, { place: '', specialty: '', year: '' }] })}>
            <Plus size={16} /> Добавить
          </Button>
        </Section>

        <Section title="Навыки и инструменты">
          <Field label="Навыки"><TagEditor value={r.skills} onChange={(skills) => set({ skills })} suggestions={SKILLS} /></Field>
          <Field label="Инструменты"><TagEditor value={r.tools} onChange={(tools) => set({ tools })} suggestions={TOOLS} /></Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink/80">Языки</p>
            {r.languages.map((l, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <Select value={l.name} onChange={(e) => set({ languages: r.languages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} options={[...LANGUAGES, 'Другой'].map((x) => ({ value: x, label: x }))} />
                <Select value={l.level} onChange={(e) => set({ languages: r.languages.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)) })} options={LANG_LEVELS.map((x) => ({ value: x, label: x }))} />
                <button type="button" onClick={() => set({ languages: r.languages.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => set({ languages: [...r.languages, { name: 'Английский', level: 'Средний' }] })}>
              <Plus size={14} /> Язык
            </Button>
          </div>
        </Section>

        <Section title="Портфолио" hint="Instagram, Behance, Google Drive, сайт">
          {r.portfolio.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input className="!w-40" value={p.label} placeholder="Instagram" onChange={(e) => set({ portfolio: r.portfolio.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <Input value={p.url} placeholder="https://" onChange={(e) => set({ portfolio: r.portfolio.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <button type="button" onClick={() => set({ portfolio: r.portfolio.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => set({ portfolio: [...r.portfolio, { label: '', url: '' }] })}>
            <Plus size={16} /> Ссылка
          </Button>
          <p className="text-xs text-muted">Сертификаты BOSS VISION добавляются в резюме автоматически после окончания курса.</p>
        </Section>

        <Section title="Условия">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Зарплата, ₸"><Input type="number" value={r.salary ?? ''} onChange={(e) => set({ salary: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Формат"><Select value={r.format} onChange={(e) => set({ format: e.target.value as Resume['format'] })} options={opts(FORMAT_LABEL)} /></Field>
            <Field label="Занятость"><Select value={r.employment} onChange={(e) => set({ employment: e.target.value as Resume['employment'] })} options={opts(EMPLOYMENT_LABEL)} /></Field>
          </div>
        </Section>
      </div>

      <div className="sticky bottom-20 z-20 mt-5 grid grid-cols-3 gap-2 rounded-3xl border border-line bg-surface/95 p-2 backdrop-blur lg:bottom-4">
        <Button onClick={save}>{saved ? 'Сохранено ✓' : 'Сохранить'}</Button>
        <Button variant="secondary" onClick={() => { save(); nav(`/resumes/${r.id}?print=1`) }}>
          <Download size={16} /> PDF
        </Button>
        <Button variant="gold" onClick={() => { save(); setSend(true) }}>
          <Send size={16} /> Отправить
        </Button>
      </div>

      <SendModal open={send} onClose={() => setSend(false)} resume={r} defaultVac={forVac} />
    </div>
  )
}

function SendModal({ open, onClose, resume, defaultVac }: { open: boolean; onClose: () => void; resume: Resume; defaultVac: string }) {
  const { db, apply } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const vacs = db.vacancies.filter((v) => v.status === 'active' && !db.applications.some((a) => a.vacancyId === v.id && a.candidateId === me.id))
  const [vid, setVid] = useState(defaultVac || vacs[0]?.id || '')
  const v = vacs.find((x) => x.id === vid)
  const [letter, setLetter] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Отправить работодателю">
      {vacs.length === 0 ? (
        <p className="text-sm text-muted">Вы уже откликнулись на все активные вакансии.</p>
      ) : (
        <div className="space-y-3">
          <Field label="Вакансия">
            <Select value={vid} onChange={(e) => setVid(e.target.value)} options={vacs.map((x) => ({ value: x.id, label: `${x.title} — ${db.companies.find((c) => c.id === x.companyId)?.name}` }))} />
          </Field>
          <div className="flex justify-end">
            <Button size="sm" variant="soft" onClick={() => v && setLetter(coverLetter(v, resume, db.companies.find((c) => c.id === v.companyId)?.name))}>
              <Sparkles size={14} /> AI-письмо
            </Button>
          </div>
          <Textarea value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Сопроводительное письмо" className="min-h-40" />
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              apply(vid, resume.id, letter)
              onClose()
              nav('/applications')
            }}
          >
            Отправить отклик
          </Button>
        </div>
      )}
    </Modal>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="space-y-3 p-5">
      <div>
        <p className="font-display text-lg font-semibold">{title}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </Card>
  )
}

function AiBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/12 px-3 text-[13px] font-semibold transition hover:bg-white/20 disabled:opacity-40">
      {children}
    </button>
  )
}
