import { Briefcase, Heart, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { VacancyCard } from '../../components/cards'
import { Button, Chip, Empty, Field, Input, Modal, PageHeader, Search, Select } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { CITIES, EMPLOYMENT_LABEL, EXPERIENCE_LABEL, FORMAT_LABEL, LANGUAGES, NICHES, NICHE_RU, SCHEDULE_LABEL } from '../../lib/format'
import { matchScore } from '../../lib/match'

const opts = (rec: Record<string, string>, any: string) => [{ value: '', label: any }, ...Object.entries(rec).map(([value, label]) => ({ value, label }))]

/** ТЗ п.10–11 — JOBS с фильтрами */
export default function Jobs() {
  const { db } = useStore()
  const me = useMe()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [niche, setNiche] = useState('')
  const [f, setF] = useState({ city: '', salary: '', format: '', experience: '', language: '', schedule: '', employment: '' })
  const [sort, setSort] = useState(params.get('sort') ?? 'new')
  const [open, setOpen] = useState(false)
  const resume = db.resumes.find((r) => r.userId === me.id)
  const activeFilters = Object.values(f).filter(Boolean).length

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const rank = { vip: 2, premium: 1, standard: 0 }
    const res = db.vacancies
      .filter((v) => v.status === 'active')
      .filter((v) => !niche || v.category === niche)
      .filter((v) => !f.city || v.city === f.city)
      .filter((v) => !f.salary || (v.salaryTo ?? v.salaryFrom ?? 0) >= Number(f.salary))
      .filter((v) => !f.format || v.format === f.format)
      .filter((v) => !f.experience || v.experience === f.experience)
      .filter((v) => !f.language || v.languages.includes(f.language))
      .filter((v) => !f.schedule || v.schedule === f.schedule)
      .filter((v) => !f.employment || v.employment === f.employment)
      .filter((v) => !s || [v.title, v.description, v.category, NICHE_RU[v.category], ...v.skills].join(' ').toLowerCase().includes(s))
      .map((v) => ({ v, score: resume ? matchScore(v, resume, me, db.settings.weights).score : undefined }))
    if (sort === 'match') res.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    else if (sort === 'salary') res.sort((a, b) => (b.v.salaryTo ?? b.v.salaryFrom ?? 0) - (a.v.salaryTo ?? a.v.salaryFrom ?? 0))
    else res.sort((a, b) => rank[b.v.tariff] - rank[a.v.tariff] || b.v.createdAt.localeCompare(a.v.createdAt))
    return res
  }, [db, q, niche, f, sort, resume, me])

  return (
    <div>
      <PageHeader title="Вакансии" subtitle={`${list.length} вакансий · AI считает совпадение по вашему резюме`} />
      <div className="flex gap-2">
        <div className="flex-1">
          <Search value={q} onChange={setQ} placeholder="Поиск вакансий…" />
        </div>
        <button type="button" onClick={() => setOpen(true)} className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface" aria-label="Фильтры">
          <SlidersHorizontal size={18} />
          {activeFilters > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">{activeFilters}</span>}
        </button>
      </div>

      <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        <Chip active={!niche} onClick={() => setNiche('')}>Все</Chip>
        {NICHES.map((n) => (
          <Chip key={n} active={niche === n} onClick={() => setNiche(n)}>
            {NICHE_RU[n]}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-muted">Сортировка:</span>
        {[
          ['new', 'Новые'],
          ['match', 'AI-совпадение'],
          ['salary', 'Зарплата'],
        ].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setSort(k)} className={`font-semibold ${sort === k ? 'text-ink underline decoration-gold decoration-2 underline-offset-4' : 'text-muted'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {list.map(({ v, score }) => (
          <VacancyCard key={v.id} v={v} score={score} />
        ))}
      </div>
      {list.length === 0 && <Empty icon={<Briefcase />} title="Ничего не найдено" text="Измените фильтры или запрос" />}

      <Modal open={open} onClose={() => setOpen(false)} title="Фильтры">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Город">
            <Select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} options={[{ value: '', label: 'Любой' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
          </Field>
          <Field label="Зарплата от, ₸">
            <Input type="number" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} placeholder="200000" />
          </Field>
          <Field label="Формат">
            <Select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} options={opts(FORMAT_LABEL, 'Любой')} />
          </Field>
          <Field label="Занятость">
            <Select value={f.employment} onChange={(e) => setF({ ...f, employment: e.target.value })} options={opts(EMPLOYMENT_LABEL, 'Любая')} />
          </Field>
          <Field label="Опыт">
            <Select value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} options={opts(EXPERIENCE_LABEL, 'Любой')} />
          </Field>
          <Field label="График">
            <Select value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} options={opts(SCHEDULE_LABEL, 'Любой')} />
          </Field>
          <Field label="Язык" className="col-span-2">
            <Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} options={[{ value: '', label: 'Любой' }, ...LANGUAGES.map((c) => ({ value: c, label: c }))]} />
          </Field>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setF({ city: '', salary: '', format: '', experience: '', language: '', schedule: '', employment: '' })}>
            Сбросить
          </Button>
          <Button className="flex-1" onClick={() => setOpen(false)}>
            Показать {list.length}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export function Saved() {
  const { db } = useStore()
  const me = useMe()
  const list = db.vacancies.filter((v) => me.favorites.includes(v.id))
  return (
    <div>
      <PageHeader title="Сохранённые" subtitle="Вакансии, к которым вы хотите вернуться" back />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((v) => (
          <VacancyCard key={v.id} v={v} />
        ))}
      </div>
      {list.length === 0 && <Empty icon={<Heart />} title="Пока пусто" text="Нажмите ♥ у вакансии, чтобы сохранить её" />}
    </div>
  )
}
