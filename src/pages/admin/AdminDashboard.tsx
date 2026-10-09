import { Award, Briefcase, Building2, ClipboardList, CreditCard, GraduationCap, Sparkles, UserCheck, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Card, Stat } from '../../components/ui'
import { useStore } from '../../data/store'
import { profileCompleteness } from '../../lib/ai'
import { money } from '../../lib/format'
import type { ProductType } from '../../types'

const WEEK = 7 * 86400000
const recent = (iso: string, ms = WEEK) => Date.now() - new Date(iso).getTime() < ms

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{title}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
    </section>
  )
}

/** ТЗ п.49 — главный Dashboard админки */
export function AdminDashboard() {
  const { db } = useStore()
  const [, setParams] = useSearchParams()
  const ok = db.payments.filter((p) => p.status === 'success')
  const rev = (t: ProductType) => ok.filter((p) => p.product.type === t).reduce((s, p) => s + p.amount, 0)
  const leadsValue = db.leads.length
  const apps = db.applications
  const pending = db.vacancies.filter((v) => v.status === 'moderation').length
  const answersPending = db.answers.filter((a) => a.status === 'pending').length

  return (
    <div className="space-y-6">
      {(pending > 0 || answersPending > 0) && (
        <div className="flex flex-wrap gap-2">
          {pending > 0 && <button type="button" onClick={() => setParams({ s: 'jobs' })} className="rounded-full bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">⚠ {pending} вакансий ждут модерации</button>}
          {answersPending > 0 && <button type="button" onClick={() => setParams({ s: 'academy', i: 'answers' })} className="rounded-full bg-danger-soft px-4 py-2 text-sm font-semibold text-danger">📝 {answersPending} заданий на проверке</button>}
        </div>
      )}
      <Group title="Users">
        <Stat icon={<Users size={20} />} label="Кандидатов" value={db.users.filter((u) => u.role === 'candidate').length} hint={`+${db.users.filter((u) => u.role === 'candidate' && recent(u.createdAt)).length} за неделю`} />
        <Stat icon={<Briefcase size={20} />} label="Предпринимателей" value={db.users.filter((u) => u.role === 'employer').length} />
        <Stat icon={<Building2 size={20} />} label="Компаний" value={db.companies.length} />
        <Stat icon={<UserCheck size={20} />} label="Команда (админ + кураторы)" value={db.users.filter((u) => u.role === 'admin' || u.role === 'curator').length} />
      </Group>
      <Group title="Jobs">
        <Stat icon={<Briefcase size={20} />} label="Активные" value={db.vacancies.filter((v) => v.status === 'active').length} />
        <Stat icon={<Sparkles size={20} />} label="Новые за неделю" value={db.vacancies.filter((v) => recent(v.createdAt)).length} />
        <Stat icon={<ClipboardList size={20} />} label="На модерации" value={pending} />
        <Stat icon={<Award size={20} />} label="Завершённые" value={db.vacancies.filter((v) => v.status === 'closed').length} />
      </Group>
      <Group title="Applications">
        <Stat icon={<ClipboardList size={20} />} label="Отклики" value={apps.length} />
        <Stat icon={<Users size={20} />} label="Интервью" value={apps.filter((a) => a.status === 'interview' || a.status === 'invited').length} />
        <Stat icon={<Sparkles size={20} />} label="Офферы" value={apps.filter((a) => a.status === 'offer').length} />
        <Stat icon={<UserCheck size={20} />} label="Наймы" value={apps.filter((a) => a.status === 'hired').length} />
      </Group>
      <Group title="Revenue">
        <Stat icon={<CreditCard size={20} />} label="Вакансии" value={money(rev('vacancy'))} />
        <Stat icon={<CreditCard size={20} />} label="База резюме" value={money(rev('base'))} />
        <Stat icon={<CreditCard size={20} />} label="Курсы" value={money(rev('course'))} />
        <Stat icon={<CreditCard size={20} />} label="Подбор / подписки (заявки)" value={leadsValue} hint={`${db.leads.filter((l) => l.status === 'new').length} новых`} />
      </Group>
      <Group title="Academy">
        <Stat icon={<GraduationCap size={20} />} label="Студентов" value={new Set(db.enrollments.map((e) => e.userId)).size} />
        <Stat icon={<CreditCard size={20} />} label="Продажи курсов" value={ok.filter((p) => p.product.type === 'course').length} />
        <Stat icon={<Sparkles size={20} />} label="Средний прогресс" value={`${avgProgress(db)}%`} />
        <Stat icon={<Award size={20} />} label="Сертификатов" value={db.certificates.length} />
      </Group>
    </div>
  )
}

function avgProgress(db: ReturnType<typeof useStore>['db']) {
  const list = db.enrollments.map((e) => {
    const c = db.courses.find((x) => x.id === e.courseId)
    const u = db.users.find((x) => x.id === e.userId)
    const n = c?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0
    return n && u ? ((u.courseProgress[e.courseId]?.length ?? 0) / n) * 100 : 0
  })
  return list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0
}

/** ТЗ п.57 — аналитика */
export function AdminAnalytics() {
  const { db } = useStore()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
    const key = d.toDateString()
    return {
      label: d.toLocaleDateString('ru-RU', { day: 'numeric' }),
      regs: db.users.filter((u) => new Date(u.createdAt).toDateString() === key).length,
      apps: db.applications.filter((a) => new Date(a.createdAt).toDateString() === key).length,
    }
  })
  const max = Math.max(1, ...days.map((d) => d.regs + d.apps))
  const cands = db.users.filter((u) => u.role === 'candidate')
  const avgProfile = cands.length ? Math.round(cands.reduce((s, u) => s + profileCompleteness(u, db.resumes.find((r) => r.userId === u.id)).pct, 0) / cands.length) : 0
  const apps = db.applications.length || 1
  const ok = db.payments.filter((p) => p.status === 'success')
  const sales = (t: ProductType) => ok.filter((p) => p.product.type === t).length

  const metrics: [string, string | number][] = [
    ['Регистрации (всего)', db.users.length],
    ['Активные пользователи (7 дней)', db.users.filter((u) => recent(u.lastActiveAt)).length],
    ['Заполненность профиля (средняя)', `${avgProfile}%`],
    ['Количество вакансий', db.vacancies.length],
    ['Количество откликов', db.applications.length],
    ['Конверсия в собеседование', `${Math.round((db.applications.filter((a) => ['invited', 'interview', 'offer', 'hired'].includes(a.status)).length / apps) * 100)}%`],
    ['Конверсия в найм', `${Math.round((db.applications.filter((a) => a.status === 'hired').length / apps) * 100)}%`],
    ['Продажи курсов', sales('course')],
    ['Продажи базы', sales('base')],
    ['Продажи вакансий', sales('vacancy')],
    ['Выручка', money(ok.reduce((s, p) => s + p.amount, 0))],
    ['AI Matching (запусков)', db.stats.aiMatchRuns],
    ['AI-вакансии (создано)', db.stats.aiVacancyRuns],
    ['AI Resume / письма', db.stats.aiResumeRuns],
    ['Создано резюме', db.resumes.length],
    ['Пройдено AI-тестов', db.users.reduce((s, u) => s + Object.keys(u.testResults).length, 0)],
  ]

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="mb-1 font-semibold">Регистрации и отклики · 14 дней</p>
        <p className="mb-4 flex gap-4 text-xs text-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-gold" />Регистрации</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />Отклики</span></p>
        <div className="flex h-44 items-end gap-1.5">
          {days.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
                <div className="rounded-t-md bg-accent" style={{ height: `${(d.apps / max) * 100}%` }} title={`Отклики: ${d.apps}`} />
                <div className="rounded-t-md bg-gold" style={{ height: `${(d.regs / max) * 100}%` }} title={`Регистрации: ${d.regs}`} />
              </div>
              <span className="text-[10px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {metrics.map(([l, v]) => (
          <div key={l} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-sm text-muted">{l}</span>
            <span className="font-display text-lg font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
