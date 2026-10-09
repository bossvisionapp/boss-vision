import { Briefcase, Building2, ClipboardList, Handshake, Plus, Search, Sparkles, UserCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CandidateCard } from '../../components/cards'
import { Avatar, Badge, Button, Card, SectionTitle } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { APP_STATUS_EMPLOYER, APP_TONE, timeAgo } from '../../lib/format'
import { matchScore } from '../../lib/match'

/** ТЗ п.25, 45 — Dashboard предпринимателя */
export default function EmployerDashboard() {
  const { db } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const company = db.companies.find((c) => c.id === me.companyId)
  const myVacs = db.vacancies.filter((v) => v.ownerId === me.id)
  const active = myVacs.filter((v) => v.status === 'active')
  const apps = db.applications.filter((a) => a.employerId === me.id)
  const week = apps.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 86400000).length

  const recommended = useMemo(() => {
    if (!active.length) return []
    return db.resumes
      .filter((r) => r.visible && !r.hiddenByAdmin)
      .map((r) => {
        const u = db.users.find((x) => x.id === r.userId)
        const best = active.map((v) => ({ v, m: matchScore(v, r, u, db.settings.weights) })).sort((a, b) => b.m.score - a.m.score)[0]
        return { r, ...best }
      })
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 3)
  }, [db, active])

  const actions = [
    { to: '/employer/ai-match', icon: Sparkles, label: 'AI-подбор кандидатов' },
    { to: '/employer/base', icon: Search, label: 'База специалистов' },
    { to: '/employer/vacancies', icon: Briefcase, label: 'Мои вакансии' },
    { to: '/employer/applicants', icon: ClipboardList, label: 'Отклики' },
    { to: '/employer/recruitment', icon: Handshake, label: 'Подбор под ключ' },
    { to: '/employer/subscription', icon: Building2, label: 'Кадровая подписка' },
  ]

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3 fade-up">
        <Avatar name={me.name} color={me.avatarColor} photo={me.avatar} size={52} ring />
        <div>
          <h1 className="font-display text-[26px] font-semibold leading-tight">Добро пожаловать, {me.name.split(' ')[0]}! 👋</h1>
          <p className="text-sm text-muted">Найдите лучших специалистов для развития вашего бизнеса{company ? ` · ${company.name}` : ''}</p>
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={() => nav('/employer/vacancies/new')}>
        <Plus size={18} /> Создать вакансию
      </Button>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-surface p-3 text-center transition hover:-translate-y-0.5 hover:border-gold/60">
            <a.icon size={22} className="text-brand" strokeWidth={1.7} />
            <span className="text-[11.5px] font-semibold leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      <section>
        <SectionTitle title="Статистика" action={<Link to="/employer/applicants" className="text-sm font-semibold text-brand">Смотреть все</Link>} />
        <div className="grid grid-cols-3 gap-3">
          <StatBox value={apps.length} label="Отклики" hint={week ? `+${week} за неделю` : undefined} />
          <StatBox value={apps.filter((a) => a.status === 'interview' || a.status === 'invited').length} label="Интервью" />
          <StatBox value={apps.filter((a) => a.status === 'hired').length} label="Нанято" />
        </div>
      </section>

      <section>
        <SectionTitle title="Рекомендуемые кандидаты" action={<Link to="/employer/ai-match" className="text-sm font-semibold text-brand">AI-подбор →</Link>} />
        {recommended.length === 0 ? (
          <Card className="text-sm text-muted">Опубликуйте вакансию — AI начнёт рекомендовать кандидатов.</Card>
        ) : (
          <div className="space-y-3">
            {recommended.map(({ r, m, v }) => (
              <CandidateCard key={r.id} r={r} match={m} action={<p className="text-xs text-muted">Лучше всего подходит на «{v.title}»</p>} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Новые отклики" />
        <div className="space-y-2">
          {apps.slice(0, 5).map((a) => {
            const r = db.resumes.find((x) => x.id === a.resumeId)
            const u = db.users.find((x) => x.id === a.candidateId)
            const v = db.vacancies.find((x) => x.id === a.vacancyId)
            return (
              <Card key={a.id} className="flex items-center gap-3 p-3" onClick={() => nav(`/employer/applicants?v=${a.vacancyId}`)}>
                <Avatar name={r?.fullName ?? '?'} color={u?.avatarColor ?? '#999'} photo={r?.photo ?? u?.avatar} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{r?.fullName}</p>
                  <p className="truncate text-xs text-muted">{v?.title} · {timeAgo(a.createdAt)}</p>
                </div>
                <Badge tone={APP_TONE[a.status]}>{APP_STATUS_EMPLOYER[a.status]}</Badge>
              </Card>
            )
          })}
          {apps.length === 0 && <Card className="text-sm text-muted">Откликов пока нет.</Card>}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card onClick={() => nav('/employer/recruitment')} className="bg-hero text-on-hero lux-grain">
          <Handshake className="text-gold" />
          <p className="mt-2 font-display text-lg font-semibold">Подбор под ключ</p>
          <p className="text-sm opacity-75">Команда BOSS VISION найдёт, отберёт и обучит сотрудника. От 150 000 ₸</p>
        </Card>
        <Card onClick={() => nav('/employer/subscription')}>
          <UserCheck className="text-gold" />
          <p className="mt-2 font-display text-lg font-semibold">Кадровая подписка</p>
          <p className="text-sm text-muted">Регулярный найм для растущего бизнеса</p>
        </Card>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><Users size={13} /> {db.resumes.filter((r) => r.visible).length} специалистов в базе BOSS VISION</p>
    </div>
  )
}

function StatBox({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] font-semibold text-success">{hint}</p>}
    </Card>
  )
}
