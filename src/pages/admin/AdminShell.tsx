import { useMemo, type ReactElement } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, Bell, Brain, Briefcase, CreditCard, GraduationCap, Inbox, LogOut, Newspaper, Settings, Users, type LucideIcon } from 'lucide-react'
import { useUnread } from '../../components/Layout'
import { Logo } from '../../components/Logo'
import { Avatar, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { ROLE_LABEL } from '../../lib/format'
import { AdminAnalytics, AdminDashboard } from './AdminDashboard'
import { AdminAnswers, AdminCertificates, AdminCourses } from './AdminAcademy'
import { AdminArticles } from './AdminContent'
import { AdminInbox } from './AdminInbox'
import { AdminJobs } from './AdminJobs'
import { AdminLeads, AdminPayments, AdminPricing, AdminPromos } from './AdminSales'
import { AdminSettings } from './AdminSettings'
import { AdminTests } from './AdminTests'
import { AdminResumes, AdminTeam, AdminUsers } from './AdminUsers'

// Консоль администратора — структура как в Learning Platform (GetCourse-стиль):
// рельс разделов слева → список страниц раздела → сама страница.
// staff: true — раздел/страницу видит и куратор (ученики, задания, входящие); остальное — только админ.

interface Page {
  id: string
  label: string
  C: () => ReactElement
  staff?: boolean
}
interface Section {
  id: string
  label: string
  icon: LucideIcon
  staff?: boolean
  pages: Page[]
}

const SECTIONS: Section[] = [
  { id: 'dash', label: 'Дашборд', icon: BarChart3, pages: [{ id: 'dash', label: 'Обзор', C: AdminDashboard }, { id: 'analytics', label: 'Аналитика', C: AdminAnalytics }] },
  {
    id: 'users', label: 'Пользователи', icon: Users, staff: true,
    pages: [{ id: 'users', label: 'Пользователи', C: AdminUsers, staff: true }, { id: 'team', label: 'Команда', C: AdminTeam }, { id: 'resumes', label: 'Кандидаты и резюме', C: AdminResumes }],
  },
  { id: 'jobs', label: 'Вакансии', icon: Briefcase, pages: [{ id: 'jobs', label: 'Все вакансии', C: AdminJobs }] },
  {
    id: 'academy', label: 'Academy', icon: GraduationCap, staff: true,
    pages: [{ id: 'answers', label: 'Задания учеников', C: AdminAnswers, staff: true }, { id: 'courses', label: 'Курсы', C: AdminCourses }, { id: 'certs', label: 'Сертификаты', C: AdminCertificates }],
  },
  { id: 'tests', label: 'AI-тесты', icon: Brain, pages: [{ id: 'tests', label: 'Тесты и результаты', C: AdminTests }] },
  { id: 'content', label: 'Контент', icon: Newspaper, pages: [{ id: 'news', label: 'Новости', C: () => <AdminArticles kind="news" /> }, { id: 'advice', label: 'Советы', C: () => <AdminArticles kind="advice" /> }] },
  {
    id: 'sales', label: 'Продажи', icon: CreditCard,
    pages: [{ id: 'payments', label: 'Платежи', C: AdminPayments }, { id: 'leads', label: 'Заявки', C: AdminLeads }, { id: 'pricing', label: 'Тарифы и подписки', C: AdminPricing }, { id: 'promos', label: 'Промокоды', C: AdminPromos }],
  },
  { id: 'inbox', label: 'Входящие', icon: Inbox, staff: true, pages: [{ id: 'inbox', label: 'Поддержка', C: AdminInbox, staff: true }] },
  { id: 'settings', label: 'Настройки', icon: Settings, pages: [{ id: 'settings', label: 'Платформа', C: AdminSettings }] },
]

export default function AdminShell() {
  const me = useMe()
  const { logout } = useStore()
  const nav = useNavigate()
  const { notes, msgs } = useUnread()
  const [params, setParams] = useSearchParams()
  const sections = useMemo(
    () => (me.role === 'admin' ? SECTIONS : SECTIONS.filter((s) => s.staff).map((s) => ({ ...s, pages: s.pages.filter((p) => p.staff) }))),
    [me.role],
  )
  const sec = sections.find((s) => s.id === params.get('s')) ?? sections[0]
  const page = sec.pages.find((p) => p.id === params.get('i')) ?? sec.pages[0]
  const go = (s: string, i?: string) => setParams(i ? { s, i } : { s })
  const Content = page.C

  return (
    <div className="min-h-screen lg:flex">
      {/* рельс разделов */}
      <aside className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col items-center gap-1 border-r border-line bg-hero py-4 text-on-hero lg:flex">
        <Link to="/admin" className="mb-3 font-display text-lg font-bold">BV</Link>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            title={s.label}
            className={cx('relative flex w-[72px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] font-semibold transition', s.id === sec.id ? 'bg-white/15' : 'opacity-65 hover:opacity-100')}
          >
            <s.icon size={20} strokeWidth={1.7} />
            {s.label}
            {s.id === 'inbox' && msgs > 0 && <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-gold" />}
          </button>
        ))}
        <div className="flex-1" />
        <Link to="/notifications" className="relative rounded-xl p-2 opacity-75 hover:opacity-100" title="Уведомления">
          <Bell size={19} />
          {notes > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />}
        </Link>
        <button type="button" onClick={() => { logout(); nav('/') }} className="rounded-xl p-2 opacity-75 hover:opacity-100" title="Выйти"><LogOut size={19} /></button>
      </aside>

      {/* страницы раздела */}
      <nav className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-line bg-surface px-3 py-5 lg:block">
        <p className="px-3 font-display text-lg font-semibold">{sec.label}</p>
        <div className="lux-line mx-3 my-3 opacity-60" />
        {sec.pages.map((p) => (
          <button key={p.id} type="button" onClick={() => go(sec.id, p.id)} className={cx('block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold', p.id === page.id ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
            {p.label}
          </button>
        ))}
        <div className="absolute bottom-5 left-3 right-3 flex items-center gap-2 rounded-2xl bg-surface-2 p-2.5">
          <Avatar name={me.name} color={me.avatarColor} photo={me.avatar} size={32} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{me.name}</p>
            <p className="text-[10px] text-muted">{ROLE_LABEL[me.role]}</p>
          </div>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {/* телефон: шапка + вкладки всех страниц */}
        <div className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <Logo size="sm" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">{ROLE_LABEL[me.role]}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/notifications" className="relative p-2"><Bell size={20} />{notes > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />}</Link>
              <button type="button" onClick={() => { logout(); nav('/') }} className="p-2" aria-label="Выйти"><LogOut size={19} /></button>
            </div>
          </div>
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pb-3">
            {sections.flatMap((s) => s.pages.map((p) => (
              <button key={s.id + p.id} type="button" onClick={() => go(s.id, p.id)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', s.id === sec.id && p.id === page.id ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-muted')}>
                {p.label}
              </button>
            )))}
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 pb-20 pt-5 lg:px-10 lg:pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{sec.label}</p>
          <h1 className="mb-5 font-display text-[28px] font-semibold">{page.label}</h1>
          <Content key={sec.id + page.id} />
        </main>
      </div>
    </div>
  )
}

/** Простая таблица для админки */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            {head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">{children}</tbody>
      </table>
    </div>
  )
}
