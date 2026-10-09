import {
  Award, Bell, Bookmark, Brain, Briefcase, ClipboardList, FileText, GraduationCap, Handshake, Home, Lightbulb, LogOut, MessageCircle,
  Newspaper, Search, Settings, Sparkles, User as UserIcon, Users, type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { isStaff, useStore } from '../data/store'
import type { Role } from '../types'
import { Logo } from './Logo'
import { Avatar, cx } from './ui'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  tab?: boolean // в нижней навигации телефона (ТЗ п.46)
}

export const NAV: Record<'candidate' | 'employer', NavItem[]> = {
  candidate: [
    { to: '/home', label: 'Главная', icon: Home, tab: true },
    { to: '/jobs', label: 'Вакансии', icon: Briefcase, tab: true },
    { to: '/academy', label: 'Academy', icon: GraduationCap, tab: true },
    { to: '/chats', label: 'Чаты', icon: MessageCircle, tab: true },
    { to: '/profile', label: 'Профиль', icon: UserIcon, tab: true },
    { to: '/tests', label: 'AI-тесты', icon: Brain },
    { to: '/resume', label: 'Моё резюме', icon: FileText },
    { to: '/applications', label: 'Мои отклики', icon: ClipboardList },
    { to: '/saved', label: 'Сохранённые', icon: Bookmark },
    { to: '/certificates', label: 'Сертификаты', icon: Award },
    { to: '/news', label: 'Новости', icon: Newspaper },
    { to: '/advice', label: 'Советы', icon: Lightbulb },
    { to: '/settings', label: 'Настройки', icon: Settings },
  ],
  employer: [
    { to: '/employer', label: 'Главная', icon: Home, tab: true },
    { to: '/employer/vacancies', label: 'Вакансии', icon: Briefcase, tab: true },
    { to: '/employer/candidates', label: 'Кандидаты', icon: Users, tab: true },
    { to: '/chats', label: 'Чаты', icon: MessageCircle, tab: true },
    { to: '/profile', label: 'Профиль', icon: UserIcon, tab: true },
    { to: '/employer/applicants', label: 'Отклики', icon: ClipboardList },
    { to: '/employer/ai-match', label: 'AI-подбор', icon: Sparkles },
    { to: '/employer/base', label: 'База резюме', icon: Search },
    { to: '/employer/recruitment', label: 'Подбор под ключ', icon: Handshake },
    { to: '/academy', label: 'Academy', icon: GraduationCap },
    { to: '/news', label: 'Новости', icon: Newspaper },
    { to: '/advice', label: 'Советы', icon: Lightbulb },
    { to: '/settings', label: 'Настройки', icon: Settings },
  ],
}

export function homePath(role: Role) {
  if (role === 'admin' || role === 'curator') return '/admin'
  return role === 'employer' ? '/employer' : '/home'
}

export function useUnread() {
  const { db, me } = useStore()
  if (!me) return { msgs: 0, notes: 0 }
  const staff = isStaff(me)
  return {
    msgs: db.threads.filter((t) => t.unreadFor.includes(me.id) || (staff && t.kind === 'support' && t.unreadFor.includes('staff'))).length,
    notes: db.notifications.filter((n) => !n.read && (n.userId === me.id || (staff && n.userId === 'staff'))).length,
  }
}

export function Layout({ children }: { children: ReactNode }) {
  const { me, logout } = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const { msgs, notes } = useUnread()
  if (!me) return null
  const items = NAV[me.role === 'employer' ? 'employer' : 'candidate']
  const roots = ['/home', '/employer']
  const active = (to: string) => (roots.includes(to) ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + '/'))

  return (
    <div className="min-h-screen lg:flex">
      {/* Компьютер — боковое меню */}
      <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <Link to={homePath(me.role)} className="px-6 pb-4 pt-6">
          <Logo size="md" />
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{me.role === 'employer' ? 'Для бизнеса' : 'Карьера и обучение'}</p>
        </Link>
        <div className="lux-line mx-6 mb-3 opacity-50" />
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={cx('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-semibold transition', active(it.to) ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-2 hover:text-ink')}
            >
              <it.icon size={18} strokeWidth={1.8} />
              <span className="flex-1">{it.label}</span>
              {it.to === '/chats' && msgs > 0 && <span className="rounded-full bg-gold px-1.5 text-[11px] text-white">{msgs}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-line p-4">
          <Avatar name={me.name} color={me.avatarColor} photo={me.avatar} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{me.name}</p>
            <p className="truncate text-xs text-muted">{me.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              nav('/')
            }}
            className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-danger"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur-xl lg:px-10">
          <Link to={homePath(me.role)} className="lg:hidden">
            <Logo size="sm" />
          </Link>
          <div className="flex-1" />
          <Link to="/notifications" className="relative rounded-full p-2 text-ink/80 hover:bg-surface-2" aria-label="Уведомления">
            <Bell size={21} strokeWidth={1.8} />
            {notes > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">{notes}</span>}
          </Link>
          <Link to="/profile" className="hidden lg:block">
            <Avatar name={me.name} color={me.avatarColor} photo={me.avatar} size={34} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-5 lg:px-10 lg:pb-14 lg:pt-8">{children}</main>
      </div>

      {/* Телефон — нижняя навигация */}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/92 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {items
            .filter((i) => i.tab)
            .map((it) => (
              <NavLink key={it.to} to={it.to} className={cx('relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold', active(it.to) ? 'text-ink' : 'text-muted')}>
                <it.icon size={22} strokeWidth={active(it.to) ? 2.2 : 1.7} />
                {it.label}
                {active(it.to) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
                {it.to === '/chats' && msgs > 0 && <span className="absolute right-[30%] top-2 h-2 w-2 rounded-full bg-gold" />}
              </NavLink>
            ))}
        </div>
      </nav>
    </div>
  )
}
