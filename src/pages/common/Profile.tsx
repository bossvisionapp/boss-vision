import {
  Award, Bookmark, Brain, Briefcase, Building2, Camera, ChevronRight, ClipboardList, CreditCard, FileText, GraduationCap, Handshake, HeadphonesIcon,
  LogOut, MapPin, Search, Settings, Sparkles, Target, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { VacancyCard } from '../../components/cards'
import { Avatar, Badge, Button, Card, PageHeader, Progress, Ring } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { careerProfile, profileCompleteness } from '../../lib/ai'
import { EXPERIENCE_LABEL, FORMAT_LABEL, ROLE_LABEL, daysLeft, money, plural, resizeImage } from '../../lib/format'
import { nicheRu } from '../../lib/match'

function MenuItem({ to, icon: Icon, label, hint, onClick }: { to?: string; icon: LucideIcon; label: string; hint?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-brand">
        <Icon size={18} />
      </span>
      <span className="flex-1 text-[14px] font-semibold">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      <ChevronRight size={16} className="text-muted" />
    </>
  )
  const cls = 'flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-surface-2'
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

export default function Profile() {
  const me = useMe()
  return me.role === 'employer' ? <EmployerProfile /> : <CandidateProfile />
}

/** ТЗ п.6–7, 15 — профиль кандидата: портфолио + AI Career Profile + меню кабинета */
function CandidateProfile() {
  const { db, updateMe, logout, openSupport } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const loc = useLocation()
  const r = db.resumes.find((x) => x.userId === me.id)
  const comp = profileCompleteness(me, r)
  const ai = careerProfile(db, me, r)
  const certs = db.certificates.filter((c) => c.userId === me.id)
  const myApps = db.applications.filter((a) => a.candidateId === me.id)
  const myCourses = db.courses.filter((c) => (me.courseProgress[c.id]?.length ?? 0) > 0 || db.enrollments.some((e) => e.userId === me.id && e.courseId === c.id))

  useEffect(() => {
    if (loc.hash === '#ai') document.getElementById('ai')?.scrollIntoView({ behavior: 'smooth' })
  }, [loc.hash])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Мой профиль" />
      <Card className="overflow-hidden p-0">
        <div className="h-24 bg-hero lux-grain" />
        <div className="-mt-12 px-5 pb-5">
          <div className="flex items-end justify-between">
            <label className="relative cursor-pointer">
              <Avatar name={me.name} color={me.avatarColor} photo={me.avatar ?? r?.photo} size={96} ring />
              <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent shadow">
                <Camera size={15} />
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => e.target.files?.[0] && updateMe({ avatar: await resizeImage(e.target.files[0]) })} />
            </label>
            <Ring value={comp.pct} size={60} label="профиль" />
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold">{me.name}</h2>
          <p className="text-muted">{r?.position || nicheRu(r?.category ?? '')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="flex items-center gap-1"><MapPin size={13} /> {me.city}</span>
            {me.age && <span>{me.age} {plural(me.age, 'год', 'года', 'лет')}</span>}
            {r && <span>{EXPERIENCE_LABEL[r.experience]}</span>}
            {r?.salary && <span>{money(r.salary)}</span>}
            {r && <span>{FORMAT_LABEL[r.format]}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {me.testResults.mbti && <Badge tone="info"><Brain size={11} /> MBTI: {me.testResults.mbti.summary}</Badge>}
            {certs.map((c) => <Badge key={c.id} tone="warn">🏆 {c.title.split('—')[0].trim()} Certified</Badge>)}
            {r?.visible ? <Badge tone="success">Открыт к предложениям</Badge> : <Badge>Резюме скрыто</Badge>}
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => nav('/resume')}>Редактировать профиль</Button>
            {r && <Button size="sm" variant="secondary" onClick={() => nav(`/resumes/${r.id}`)}>Как видит работодатель</Button>}
          </div>
        </div>
      </Card>

      {/* AI Career Profile */}
      <div id="ai" className="scroll-mt-24 overflow-hidden rounded-[30px] bg-hero p-5 text-on-hero lux-grain sm:p-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-xl font-semibold"><Sparkles size={20} className="text-gold" /> AI Career Profile</p>
          <Ring value={ai.careerMatch} size={56} />
        </div>
        <p className="mt-1 text-sm opacity-70">На основе опыта, навыков, тестов, образования и желаемой профессии</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AiList icon={TrendingUp} title="Сильные стороны" items={ai.strengths} empty="Пройдите тесты — AI определит сильные стороны" />
          <AiList icon={Target} title="Зоны развития" items={ai.growth} empty="Появятся после AI-тестов" mark="→" />
          <AiList icon={Briefcase} title="Подходящие профессии" items={ai.professions} />
          <AiList icon={GraduationCap} title="Рекомендуемые курсы" items={ai.courses.map((c) => c.title)} />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Карьерный план</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ai.plan.map((p) => (
              <div key={p.period} className="rounded-2xl bg-white/[.07] p-3">
                <p className="text-sm font-semibold">{p.period}</p>
                <ul className="mt-1.5 space-y-1 text-[12.5px] opacity-80">{p.steps.map((s) => <li key={s}>• {s}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ai.vacancies.length > 0 && (
        <div>
          <p className="mb-2 font-display text-lg font-semibold">Рекомендованные вакансии</p>
          <div className="grid gap-3 sm:grid-cols-2">{ai.vacancies.slice(0, 2).map(({ v, score }) => <VacancyCard key={v.id} v={v} score={score} />)}</div>
        </div>
      )}

      <Card className="p-2">
        <MenuItem to="/resume" icon={FileText} label="Моё резюме" hint={`${comp.pct}%`} />
        <MenuItem to="/applications" icon={ClipboardList} label="Мои отклики" hint={String(myApps.length)} />
        <MenuItem to="/academy?tab=my" icon={GraduationCap} label="Мои курсы" hint={String(myCourses.length)} />
        <MenuItem to="/tests" icon={Brain} label="Мои тесты" hint={`${Object.keys(me.testResults).length}`} />
        <MenuItem to="/jobs?sort=match" icon={Sparkles} label="Рекомендованные вакансии" />
        <MenuItem to="/saved" icon={Bookmark} label="Сохранённые вакансии" hint={String(me.favorites.length)} />
        <MenuItem to="/certificates" icon={Award} label="Сертификаты" hint={String(certs.length)} />
        <MenuItem to="/settings" icon={Settings} label="Настройки" />
        <MenuItem icon={HeadphonesIcon} label="Поддержка" onClick={() => nav(`/chats/${openSupport('Поддержка BOSS VISION')}`)} />
      </Card>
      <Button variant="danger" className="w-full" onClick={() => { logout(); nav('/') }}>
        <LogOut size={17} /> Выйти
      </Button>
    </div>
  )
}

function AiList({ icon: Icon, title, items, empty, mark = '✓' }: { icon: LucideIcon; title: string; items: string[]; empty?: string; mark?: string }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold"><Icon size={13} /> {title}</p>
      {items.length ? <ul className="space-y-1 text-sm">{items.map((x) => <li key={x}>{mark} {x}</li>)}</ul> : <p className="text-sm opacity-60">{empty}</p>}
    </div>
  )
}

/** Профиль предпринимателя: компания + меню */
function EmployerProfile() {
  const { db, update, logout, openSupport } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const company = db.companies.find((c) => c.id === me.companyId)
  const vacs = db.vacancies.filter((v) => v.ownerId === me.id)
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Профиль компании" />
      <Card className="flex items-center gap-4">
        <Avatar name={me.name} color={me.avatarColor} photo={me.avatar} size={64} ring />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold">{me.name}</p>
          <p className="text-sm text-muted">{ROLE_LABEL.employer} · {me.email}</p>
        </div>
      </Card>
      {company && (
        <Card className="space-y-2">
          <p className="flex items-center gap-2 font-display text-lg font-semibold"><Building2 size={18} className="text-gold" /> {company.name}</p>
          <p className="text-sm text-muted">{company.industry} · {company.city} · {company.employees} сотрудников · оборот {company.turnover}</p>
          <textarea
            defaultValue={company.about}
            onBlur={(e) => update((d) => ({ ...d, companies: d.companies.map((c) => (c.id === company.id ? { ...c, about: e.target.value } : c)) }))}
            placeholder="О компании — увидят кандидаты"
            className="min-h-24 w-full rounded-2xl border border-line bg-surface p-3 text-sm outline-none focus:border-brand"
          />
          <p className="text-[11px] text-muted">Сохраняется автоматически</p>
        </Card>
      )}
      {me.baseAccess.length > 0 && (
        <Card>
          <p className="mb-2 font-semibold">Доступ к базе резюме</p>
          {me.baseAccess.map((a) => (
            <div key={a.niche} className="mb-2">
              <div className="flex justify-between text-sm"><span>{nicheRu(a.niche)}</span><span className="text-muted">ещё {daysLeft(a.until)} дн.</span></div>
              <Progress value={(daysLeft(a.until) / 30) * 100} gold />
            </div>
          ))}
        </Card>
      )}
      <Card className="p-2">
        <MenuItem to="/employer/vacancies" icon={Briefcase} label="Мои вакансии" hint={String(vacs.length)} />
        <MenuItem to="/employer/applicants" icon={ClipboardList} label="Отклики" />
        <MenuItem to="/employer/ai-match" icon={Sparkles} label="AI-подбор кандидатов" />
        <MenuItem to="/employer/base" icon={Search} label="База резюме" />
        <MenuItem to="/employer/recruitment" icon={Handshake} label="Подбор под ключ" />
        <MenuItem to="/employer/subscription" icon={Building2} label="Кадровая подписка" />
        <MenuItem to="/settings?tab=payments" icon={CreditCard} label="Платежи и чеки" />
        <MenuItem to="/settings" icon={Settings} label="Настройки" />
        <MenuItem icon={HeadphonesIcon} label="Поддержка" onClick={() => nav(`/chats/${openSupport('Поддержка BOSS VISION')}`)} />
      </Card>
      <Button variant="danger" className="w-full" onClick={() => { logout(); nav('/') }}>
        <LogOut size={17} /> Выйти
      </Button>
    </div>
  )
}
