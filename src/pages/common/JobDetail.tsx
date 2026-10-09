import { Brain, Briefcase, CalendarDays, CheckCircle2, Clock, Eye, FileText, Globe2, GraduationCap, Heart, Languages, MapPin, Share2, Sparkles, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CompanyMark, MatchBreakdown } from '../../components/cards'
import { Badge, Button, Card, Empty, Modal, Tabs, Textarea, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { coverLetter } from '../../lib/ai'
import { APP_STATUS_CANDIDATE, APP_TONE, EMPLOYMENT_LABEL, EXPERIENCE_LABEL, FORMAT_LABEL, SCHEDULE_LABEL, VACANCY_STATUS_LABEL, VACANCY_TONE, dateLong, salaryRange, timeAgo } from '../../lib/format'
import { matchScore, nicheRu } from '../../lib/match'

/** ТЗ п.12–13 — карточка вакансии и отклик */
export default function JobDetail() {
  const { id } = useParams()
  const { db, update, toggleFavorite, apply, openThread, bumpStat } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const v = db.vacancies.find((x) => x.id === id)
  const [tab, setTab] = useState<'desc' | 'req'>('desc')
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<'choose' | 'letter' | 'sent'>('choose')
  const [letter, setLetter] = useState('')
  const [copied, setCopied] = useState(false)
  const counted = useRef(false)

  useEffect(() => {
    if (v && !counted.current && v.ownerId !== me.id) {
      counted.current = true
      update((d) => ({ ...d, vacancies: d.vacancies.map((x) => (x.id === v.id ? { ...x, views: x.views + 1 } : x)) }))
    }
  }, [v, me.id, update])

  if (!v) return <Empty icon={<Briefcase />} title="Вакансия не найдена" />

  const company = db.companies.find((c) => c.id === v.companyId)
  const resume = db.resumes.find((r) => r.userId === me.id)
  const isOwner = v.ownerId === me.id
  const isCandidate = me.role === 'candidate'
  const myApp = db.applications.find((a) => a.vacancyId === v.id && a.candidateId === me.id)
  const fav = me.favorites.includes(v.id)
  const m = resume && isCandidate ? matchScore(v, resume, me, db.settings.weights) : null
  const course = db.courses.find((c) => c.id === (v.category === 'Sales Manager' ? 'c_sales' : 'c_miniboss'))

  const share = async () => {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: v.title, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      /* пользователь закрыл окно */
    }
  }

  const info: [React.ReactNode, string, string][] = [
    [<MapPin size={15} />, 'Город', v.city],
    [<Wallet size={15} />, 'Зарплата', salaryRange(v.salaryFrom, v.salaryTo)],
    [<Globe2 size={15} />, 'Формат', FORMAT_LABEL[v.format]],
    [<Briefcase size={15} />, 'Занятость', EMPLOYMENT_LABEL[v.employment]],
    [<Clock size={15} />, 'Опыт', EXPERIENCE_LABEL[v.experience]],
    [<CalendarDays size={15} />, 'График', SCHEDULE_LABEL[v.schedule]],
    [<Languages size={15} />, 'Язык', v.languages.join(', ') || '—'],
    [<Eye size={15} />, 'Опубликовано', timeAgo(v.createdAt)],
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => nav(-1)} className="text-sm font-semibold text-muted hover:text-ink">
          ← Детали вакансии
        </button>
        <div className="flex gap-1">
          <button type="button" onClick={share} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Поделиться">
            <Share2 size={19} />
          </button>
          {isCandidate && (
            <button type="button" onClick={() => toggleFavorite(v.id)} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Сохранить">
              <Heart size={19} className={fav ? 'fill-danger text-danger' : ''} />
            </button>
          )}
        </div>
      </div>
      {copied && <p className="mb-3 rounded-2xl bg-success-soft px-4 py-2 text-sm text-success">Ссылка скопирована</p>}

      <Card className="p-5 sm:p-6">
        <div className="flex gap-4">
          <CompanyMark name={company?.name ?? '?'} size={60} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{nicheRu(v.category)}</Badge>
              {v.status !== 'active' && <Badge tone={VACANCY_TONE[v.status]}>{VACANCY_STATUS_LABEL[v.status]}</Badge>}
              {v.tariff !== 'standard' && <Badge tone={v.tariff === 'vip' ? 'dark' : 'warn'}>{v.tariff.toUpperCase()}</Badge>}
            </div>
            <h1 className="mt-1.5 font-display text-[26px] font-semibold leading-tight">{v.title}</h1>
            <p className="text-sm text-muted">{company?.name}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {info.map(([icon, l, val]) => (
            <div key={l}>
              <p className="flex items-center gap-1 text-[11px] text-muted">
                {icon} {l}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold">{val}</p>
            </div>
          ))}
        </div>

        {isCandidate && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {myApp ? (
              <Badge tone={APP_TONE[myApp.status]} className="h-12 justify-center rounded-2xl text-sm">
                {APP_STATUS_CANDIDATE[myApp.status]}
              </Badge>
            ) : (
              <Button size="lg" onClick={() => { setStage('choose'); setOpen(true) }}>
                Откликнуться
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => toggleFavorite(v.id)}>
              <Heart size={17} className={fav ? 'fill-danger text-danger' : ''} /> {fav ? 'Сохранено' : 'Сохранить'}
            </Button>
            <Button variant="soft" onClick={() => nav('/tests')}>
              <Brain size={16} /> Пройти AI-тест
            </Button>
            <Button
              variant="soft"
              onClick={() => {
                if (!resume) return nav('/resume')
                setLetter(coverLetter(v, resume, company?.name))
                setStage('letter')
                setOpen(true)
              }}
            >
              <Sparkles size={16} /> Создать сопроводительное
            </Button>
          </div>
        )}

        {isOwner && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => nav(`/employer/applicants?v=${v.id}`)}>Отклики · {db.applications.filter((a) => a.vacancyId === v.id).length}</Button>
            <Button variant="gold" onClick={() => nav(`/employer/ai-match?v=${v.id}`)}>
              <Sparkles size={16} /> AI-подбор
            </Button>
            <Button variant="secondary" onClick={() => nav(`/employer/vacancies/${v.id}/edit`)}>
              Редактировать
            </Button>
          </div>
        )}
        {!isOwner && !isCandidate && me.role === 'employer' && <p className="mt-4 text-sm text-muted">Вы смотрите вакансию другой компании.</p>}
      </Card>

      {m && (
        <Card className="mt-4 border-gold/40">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold">AI Match</p>
            <span className="font-display text-3xl font-semibold text-success">{m.score}%</span>
          </div>
          <div className="mt-3">
            <MatchBreakdown m={m} />
          </div>
          {m.reasons.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] font-semibold">Почему подходит</p>
              <p className="mt-1 text-sm text-success">✓ {m.reasons.join('   ✓ ')}</p>
            </div>
          )}
          {m.improve.length > 0 && (
            <div className="mt-3">
              <p className="text-[13px] font-semibold">Что улучшить</p>
              <ul className="mt-1 space-y-0.5 text-sm text-muted">
                {m.improve.map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            </div>
          )}
          {course && m.score < 90 && (
            <Link to={`/academy/${course.id}`} className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <GraduationCap className="text-gold" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">Рекомендуемый курс: {course.title}</p>
                <p className="text-xs text-muted">Закроет пробелы и добавит сертификат в профиль</p>
              </div>
            </Link>
          )}
        </Card>
      )}

      <Card className="mt-4 p-5 sm:p-6">
        <Tabs tabs={[{ id: 'desc', label: 'Описание' }, { id: 'req', label: 'Требования' }]} value={tab} onChange={setTab} />
        {tab === 'desc' ? (
          <div className="space-y-5">
            <p className="whitespace-pre-line leading-relaxed">{v.description}</p>
            {v.duties.length > 0 && (
              <div>
                <p className="mb-2 font-semibold">Ключевые обязанности</p>
                <ul className="space-y-1.5">
                  {v.duties.map((d) => (
                    <li key={d} className="flex gap-2 text-[15px]">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {v.extra && (
              <div>
                <p className="mb-1 font-semibold">Дополнительные пожелания работодателя</p>
                <p className="text-muted">{v.extra}</p>
              </div>
            )}
            {v.startDate && <p className="text-sm text-muted">Дата начала работы: {dateLong(v.startDate)}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            <ul className="list-disc space-y-1 pl-5">
              {v.requirements.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <div>
              <p className="mb-2 font-semibold">Навыки</p>
              <div className="flex flex-wrap gap-1.5">
                {v.skills.map((s) => (
                  <Badge key={s} tone={m && !m.missingSkills.includes(s) ? 'success' : 'neutral'}>
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {company && (
        <Card className="mt-4">
          <p className="font-semibold">{company.name}</p>
          <p className="text-sm text-muted">
            {company.industry} · {company.city} · {company.employees} сотрудников
          </p>
          {company.about && <p className="mt-2 text-sm">{company.about}</p>}
          {isCandidate && myApp && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => nav(`/chats/${openThread(v.ownerId, v.title, v.id)}`)}
            >
              Написать работодателю
            </Button>
          )}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={stage === 'sent' ? 'Application Sent' : stage === 'letter' ? 'Сопроводительное письмо' : 'Отклик на вакансию'}>
        {stage === 'choose' && (
          <div className="space-y-3">
            {resume ? (
              <button
                type="button"
                onClick={() => {
                  setLetter(letter || '')
                  setStage('letter')
                }}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-accent bg-surface-2 p-4 text-left"
              >
                <FileText className="text-brand" />
                <div className="flex-1">
                  <p className="font-semibold">Использовать моё резюме</p>
                  <p className="text-xs text-muted">
                    {resume.position || 'Резюме'} · обновлено {timeAgo(resume.updatedAt)}
                  </p>
                </div>
              </button>
            ) : null}
            <button type="button" onClick={() => nav(`/resume?for=${v.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left">
              <Sparkles className="text-gold" />
              <div className="flex-1">
                <p className="font-semibold">{resume ? 'Обновить резюме под вакансию' : 'Создать резюме'}</p>
                <p className="text-xs text-muted">AI адаптирует навыки и текст «о себе»</p>
              </div>
            </button>
          </div>
        )}
        {stage === 'letter' && resume && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Необязательно, но повышает шанс ответа</p>
              <Button
                size="sm"
                variant="soft"
                onClick={() => {
                  setLetter(coverLetter(v, resume, company?.name))
                  bumpStat('aiResumeRuns')
                }}
              >
                <Sparkles size={14} /> Сгенерировать AI
              </Button>
            </div>
            <Textarea value={letter} onChange={(e) => setLetter(e.target.value)} className="min-h-52" placeholder="Здравствуйте! …" />
            {myApp ? (
              <Button className="w-full" variant="secondary" onClick={() => navigator.clipboard?.writeText(letter)}>
                Скопировать письмо
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  apply(v.id, resume.id, letter)
                  setStage('sent')
                }}
              >
                Отправить отклик
              </Button>
            )}
          </div>
        )}
        {stage === 'sent' && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 size={34} />
            </div>
            <p className="mt-3 text-muted">Работодатель получил уведомление. Статус: «Отклик отправлен».</p>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Закрыть
              </Button>
              <Button className={cx('flex-1')} onClick={() => nav('/applications')}>
                Мои отклики
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
