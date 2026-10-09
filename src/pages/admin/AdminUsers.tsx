import { Eye, EyeOff, LogIn, Plus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { homePath } from '../../components/Layout'
import { Avatar, Badge, Button, Chip, Field, Input, Modal, Search, Select, Textarea, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { ROLE_LABEL, dateLong, daysLeft, nowIso, timeAgo, uid } from '../../lib/format'
import { nicheRu } from '../../lib/match'
import type { Role, User } from '../../types'
import { Table } from './AdminShell'

function newUser(p: { name: string; email: string; phone: string; role: Role; password: string }): User {
  return {
    id: uid('u'), email: p.email.trim(), password: p.password, name: p.name || p.email.split('@')[0], phone: p.phone, city: 'Алматы', role: p.role,
    avatarColor: ['#8a6a4d', '#5f7c6a', '#6f7d8c', '#9b6b52'][Math.floor(Math.random() * 4)], createdAt: nowIso(), lastActiveAt: nowIso(),
    favorites: [], savedNews: [], testResults: {}, courseProgress: {}, baseAccess: [], interests: [],
    settings: { theme: 'classic', mode: 'auto', push: true, email: true, whatsapp: false }, activity: [{ at: nowIso(), text: 'Создан администратором' }], onboarded: true,
  }
}
const randomPassword = () => Math.random().toString(36).slice(2, 10)

/** ТЗ п.50 — управление пользователями (по образцу Learning Platform: создание, роли, доступы к курсам, блокировка) */
export function AdminUsers() {
  const { db } = useStore()
  const me = useMe()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [open, setOpen] = useState<string | null>(null)
  const [add, setAdd] = useState<'single' | 'bulk' | null>(null)
  const curatorView = me.role === 'curator'
  const list = db.users
    .filter((u) => !curatorView || u.role === 'candidate') // куратор видит только учеников
    .filter((u) => !role || u.role === role)
    .filter((u) => !q || (u.name + u.email + u.phone).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="min-w-60 flex-1"><Search value={q} onChange={setQ} placeholder="Поиск по имени, e-mail, телефону" /></div>
        <Button onClick={() => setAdd('single')}><UserPlus size={16} /> Добавить</Button>
        {!curatorView && <Button variant="secondary" onClick={() => setAdd('bulk')}><Plus size={16} /> Списком</Button>}
      </div>
      {!curatorView && (
        <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
          <Chip active={!role} onClick={() => setRole('')}>Все · {db.users.length}</Chip>
          {(['candidate', 'employer', 'curator', 'admin'] as Role[]).map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{ROLE_LABEL[r]} · {db.users.filter((u) => u.role === r).length}</Chip>)}
        </div>
      )}
      <Table head={['Пользователь', 'Роль', 'Курсы', 'Активность', 'Статус']}>
        {list.map((u) => (
          <tr key={u.id} onClick={() => setOpen(u.id)} className="cursor-pointer hover:bg-surface-2/60">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} color={u.avatarColor} photo={u.avatar} size={34} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-muted">{u.email} · {u.phone}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'dark' : u.role === 'curator' ? 'info' : u.role === 'employer' ? 'brand' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge></td>
            <td className="px-4 py-3 text-muted">{db.enrollments.filter((e) => e.userId === u.id).length || '—'}</td>
            <td className="px-4 py-3 text-muted">{timeAgo(u.lastActiveAt)}</td>
            <td className="px-4 py-3">{u.blocked ? <Badge tone="danger">Заблокирован</Badge> : <Badge tone="success">Активен</Badge>}</td>
          </tr>
        ))}
      </Table>
      {open && <UserModal id={open} onClose={() => setOpen(null)} />}
      {add && <AddUsers mode={add} onClose={() => setAdd(null)} />}
    </div>
  )
}

function UserModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, update, grantCourse, revokeCourse, loginAs } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const u = db.users.find((x) => x.id === id)!
  const [f, setF] = useState({ name: u.name, email: u.email, phone: u.phone, city: u.city })
  const [showPwd, setShowPwd] = useState(false)
  const [course, setCourse] = useState('')
  const [until, setUntil] = useState('')
  const isAdmin = me.role === 'admin'
  const patch = (p: Partial<User>) => update((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const r = db.resumes.find((x) => x.userId === id)
  const enr = db.enrollments.filter((e) => e.userId === id)
  const company = db.companies.find((c) => c.id === u.companyId)

  return (
    <Modal open onClose={onClose} title={u.name} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={u.name} color={u.avatarColor} photo={u.avatar} size={56} />
          <div className="flex-1">
            <p className="text-sm text-muted">{ROLE_LABEL[u.role]} · с {dateLong(u.createdAt)}{company ? ` · ${company.name}` : ''}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {u.testResults.mbti && <Badge tone="info">MBTI {u.testResults.mbti.summary}</Badge>}
              {r && <Link to={`/resumes/${r.id}`} className="text-xs font-semibold text-brand underline">Резюме</Link>}
            </div>
          </div>
          {isAdmin && u.id !== me.id && (
            <Button size="sm" variant="secondary" onClick={() => { loginAs(u.id); nav(homePath(u.role)) }}><LogIn size={14} /> Войти как</Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="E-mail (логин)"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Телефон"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Город"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => patch(f)}>Сохранить</Button>
          <span className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
            Пароль: <b>{showPwd ? u.password : '••••••'}</b>
            <button type="button" onClick={() => setShowPwd(!showPwd)} aria-label="Показать">{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </span>
          <Button size="sm" variant="secondary" onClick={() => { const p = randomPassword(); patch({ password: p }); setShowPwd(true) }}>Новый пароль</Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {isAdmin && u.id !== me.id && (
            <Field label="Роль" className="w-52">
              <Select value={u.role} onChange={(e) => patch({ role: e.target.value as Role })} options={(['candidate', 'employer', 'curator', 'admin'] as Role[]).map((x) => ({ value: x, label: ROLE_LABEL[x] }))} />
            </Field>
          )}
          {u.id !== me.id && (isAdmin || u.role === 'candidate') && (
            <div className="self-end">
              <Button variant={u.blocked ? 'secondary' : 'danger'} onClick={() => patch({ blocked: !u.blocked })}>{u.blocked ? 'Разблокировать' : 'Заблокировать'}</Button>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold">Доступ к курсам</p>
          {enr.map((e) => {
            const c = db.courses.find((x) => x.id === e.courseId)
            const pct = c ? Math.round(((u.courseProgress[c.id]?.length ?? 0) / Math.max(1, c.modules.reduce((s, m) => s + m.lessons.length, 0))) * 100) : 0
            return (
              <div key={e.id} className="mb-1.5 flex items-center gap-2 rounded-2xl border border-line px-3 py-2 text-sm">
                <span className="flex-1">{c?.title} · {pct}% {e.until && <span className="text-muted">· до {dateLong(e.until)}</span>}</span>
                <Badge>{e.source === 'payment' ? 'оплата' : 'выдан вручную'}</Badge>
                <button type="button" onClick={() => revokeCourse(u.id, e.courseId)} className="text-xs font-semibold text-danger">Закрыть</button>
              </div>
            )
          })}
          <div className="mt-2 flex flex-wrap gap-2">
            <Select value={course} onChange={(e) => setCourse(e.target.value)} className="!w-auto flex-1" options={[{ value: '', label: 'Выдать курс…' }, ...db.courses.filter((c) => !c.comingSoon && c.price > 0 && !enr.some((e) => e.courseId === c.id)).map((c) => ({ value: c.id, label: c.title }))]} />
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="!w-44" title="Доступ до (необязательно)" />
            <Button disabled={!course} onClick={() => { grantCourse(u.id, course, until ? new Date(until).toISOString() : undefined); setCourse('') }}>Выдать</Button>
          </div>
        </div>

        {u.baseAccess.length > 0 && (
          <div>
            <p className="mb-2 font-semibold">Доступ к базе резюме</p>
            {u.baseAccess.map((a) => <p key={a.niche} className="text-sm">{nicheRu(a.niche)} — ещё {daysLeft(a.until)} дн.</p>)}
          </div>
        )}

        <div>
          <p className="mb-2 font-semibold">История активности</p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {u.activity.length === 0 && <p className="text-sm text-muted">Пусто</p>}
            {u.activity.map((a, i) => <p key={i} className="text-sm"><span className="text-muted">{timeAgo(a.at)} ·</span> {a.text}</p>)}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Добавить пользователя / списком «email; имя; телефон» (как в Learning Platform) */
function AddUsers({ mode, onClose, staff }: { mode: 'single' | 'bulk'; onClose: () => void; staff?: boolean }) {
  const { db, update } = useStore()
  const me = useMe()
  const [f, setF] = useState({ name: '', email: '', phone: '', role: (staff ? 'curator' : 'candidate') as Role, password: randomPassword(), course: '' })
  const [bulk, setBulk] = useState('')
  const [done, setDone] = useState<string[]>([])

  const create = (p: { name: string; email: string; phone: string }, role: Role, password: string, course?: string) => {
    if (!/\S+@\S+/.test(p.email) || db.users.some((x) => x.email.toLowerCase() === p.email.toLowerCase())) return `✗ ${p.email}: уже есть или неверный e-mail`
    const u = newUser({ ...p, role, password })
    update((d) => ({
      ...d,
      users: [...d.users, u],
      enrollments: course ? [...d.enrollments, { id: uid('e'), userId: u.id, courseId: course, grantedAt: nowIso(), source: 'admin' as const }] : d.enrollments,
    }))
    return `✓ ${p.email} · пароль ${password}`
  }

  return (
    <Modal open onClose={onClose} title={staff ? 'Пригласить в команду' : mode === 'bulk' ? 'Добавить списком' : 'Новый пользователь'}>
      {done.length > 0 ? (
        <div className="space-y-2">
          {done.map((x) => <p key={x} className={cx('text-sm', x.startsWith('✓') ? 'text-success' : 'text-danger')}>{x}</p>)}
          <p className="text-xs text-muted">Передайте логин и пароль пользователю (в проде — письмо со ссылкой).</p>
          <Button className="w-full" onClick={onClose}>Готово</Button>
        </div>
      ) : mode === 'bulk' ? (
        <div className="space-y-3">
          <Field label="Каждая строка: e-mail; имя; телефон"><Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'aigul@mail.kz; Айгуль Б.; +7 701 000 00 00'} className="min-h-40" /></Field>
          <Field label="Выдать курс всем (необязательно)">
            <Select value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} options={[{ value: '', label: '—' }, ...db.courses.filter((c) => !c.comingSoon && c.price > 0).map((c) => ({ value: c.id, label: c.title }))]} />
          </Field>
          <Button className="w-full" onClick={() => setDone(bulk.split('\n').filter((l) => l.trim()).map((l) => {
            const [email, name, phone] = l.split(/[;,\t]/).map((x) => x?.trim() ?? '')
            return create({ email, name, phone }, 'candidate', randomPassword(), f.course || undefined)
          }))}>Добавить</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Имя"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="E-mail"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Телефон"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          {me.role === 'admin' && (
            <Field label="Роль">
              <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} options={(staff ? ['curator', 'admin'] : ['candidate', 'employer', 'curator', 'admin']).map((x) => ({ value: x, label: ROLE_LABEL[x as Role] }))} />
            </Field>
          )}
          <Field label="Пароль"><Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          {f.role === 'candidate' && (
            <Field label="Сразу выдать курс">
              <Select value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} options={[{ value: '', label: '—' }, ...db.courses.filter((c) => !c.comingSoon && c.price > 0).map((c) => ({ value: c.id, label: c.title }))]} />
            </Field>
          )}
          <Button className="w-full" onClick={() => setDone([create(f, me.role === 'curator' ? 'candidate' : f.role, f.password, f.course || undefined)])}>Создать</Button>
        </div>
      )}
    </Modal>
  )
}

export function AdminTeam() {
  const { db } = useStore()
  const [add, setAdd] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const team = db.users.filter((u) => u.role === 'admin' || u.role === 'curator')
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted">Куратор видит только учеников, задания и входящие — контент и деньги ему недоступны.</p>
        <Button onClick={() => setAdd(true)}><UserPlus size={16} /> Пригласить куратора</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {team.map((u) => (
          <button key={u.id} type="button" onClick={() => setOpen(u.id)} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 text-left">
            <Avatar name={u.name} color={u.avatarColor} size={44} />
            <div className="flex-1">
              <p className="font-semibold">{u.name}</p>
              <p className="text-xs text-muted">{u.email}</p>
            </div>
            <Badge tone={u.role === 'admin' ? 'dark' : 'info'}>{ROLE_LABEL[u.role]}</Badge>
          </button>
        ))}
      </div>
      {add && <AddUsers mode="single" staff onClose={() => setAdd(false)} />}
      {open && <UserModal id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

export function AdminResumes() {
  const { db, update } = useStore()
  const [q, setQ] = useState('')
  const list = db.resumes.filter((r) => !q || (r.fullName + r.position + r.skills.join(' ')).toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Поиск кандидатов" /></div>
      <Table head={['Кандидат', 'Ниша', 'Город', 'Обновлено', 'Видимость']}>
        {list.map((r) => {
          const u = db.users.find((x) => x.id === r.userId)
          return (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <Link to={`/resumes/${r.id}`} className="flex items-center gap-3 font-semibold hover:text-brand">
                  <Avatar name={r.fullName} color={u?.avatarColor ?? '#999'} photo={r.photo ?? u?.avatar} size={32} /> {r.fullName}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{nicheRu(r.category)}</td>
              <td className="px-4 py-3 text-muted">{r.city}</td>
              <td className="px-4 py-3 text-muted">{timeAgo(r.updatedAt)}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => update((d) => ({ ...d, resumes: d.resumes.map((x) => (x.id === r.id ? { ...x, hiddenByAdmin: !x.hiddenByAdmin } : x)) }))}>
                  {r.hiddenByAdmin ? <Badge tone="danger">Скрыто модератором</Badge> : r.visible ? <Badge tone="success">Видно</Badge> : <Badge>Скрыто автором</Badge>}
                </button>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
