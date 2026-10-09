import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  AnswerStatus, Application, ApplicationStatus, Attachment, Course, DB, Lead, Payment, ProductType, Promo, Resume, TestResult,
  ThemeMode, ThemeName, User, Vacancy,
} from '../types'
import { addDays, nowIso, uid } from '../lib/format'
import { indexTests } from '../lib/match'
import { lessonIds } from './courses'
import { createSeed } from './seed'

// Демо-«бэкенд» в localStorage. Все бизнес-правила (доступы после оплаты, сертификаты, уведомления)
// собраны здесь как чистые функции над DB — при переходе на Supabase они переезжают в SQL/edge-функции.

const DB_KEY = 'bv_db_v2'
const SESSION_KEY = 'bv_session_v2'
const GUEST_THEME_KEY = 'bv_theme'

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* повреждённые данные — начинаем с демо */
  }
  return createSeed()
}
function lsGet(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* приватный режим — работаем в памяти */
  }
}

/* ───────── чистые операции ───────── */

export function notify(d: DB, userId: string, text: string, link?: string): DB {
  return { ...d, notifications: [{ id: uid('nt'), userId, text, link, read: false, createdAt: nowIso() }, ...d.notifications].slice(0, 400) }
}
function log(d: DB, userId: string, text: string): DB {
  return { ...d, users: d.users.map((u) => (u.id === userId ? { ...u, lastActiveAt: nowIso(), activity: [{ at: nowIso(), text }, ...u.activity].slice(0, 40) } : u)) }
}
function patchUser(d: DB, id: string, patch: Partial<User>): DB {
  return { ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }
}

export function hasCourseAccess(d: DB, u: User | null, c: Course) {
  if (!u) return false
  if (u.role === 'admin' || u.role === 'curator' || c.price === 0) return true
  return d.enrollments.some((e) => e.userId === u.id && e.courseId === c.id && (!e.until || new Date(e.until) > new Date()))
}

export function hasBaseAccess(u: User | null, niche: string) {
  if (!u) return false
  if (u.role === 'admin') return true
  return u.baseAccess.some((a) => (a.niche === niche || a.niche === 'all') && new Date(a.until) > new Date())
}

/** Контакты кандидата видны: самому себе, админу, работодателю с доступом к нише или если кандидат откликался/приглашён */
export function canSeeContacts(d: DB, u: User | null, r: Resume) {
  if (!u) return false
  if (u.id === r.userId || u.role === 'admin') return true
  if (hasBaseAccess(u, r.category)) return true
  return d.applications.some((a) => a.resumeId === r.id && a.employerId === u.id)
}

function grantCourse(d: DB, userId: string, courseId: string, source: 'payment' | 'admin', until?: string): DB {
  if (d.enrollments.some((e) => e.userId === userId && e.courseId === courseId)) {
    return { ...d, enrollments: d.enrollments.map((e) => (e.userId === userId && e.courseId === courseId ? { ...e, until } : e)) }
  }
  const c = d.courses.find((x) => x.id === courseId)
  const next = { ...d, enrollments: [...d.enrollments, { id: uid('e'), userId, courseId, grantedAt: nowIso(), until, source }] }
  return notify(next, userId, `Вам открыт доступ к курсу «${c?.title}» 🎓`, `/academy/${courseId}`)
}

/** ТЗ п.55 — оплата сама меняет доступ, без ручных активаций */
function applyGrants(d: DB, p: Payment): DB {
  const { product } = p
  let next = d
  if (product.type === 'course' && product.refId) next = grantCourse(next, p.userId, product.refId, 'payment')
  if (product.type === 'base') {
    const days = product.meta?.period === 'year' ? 365 : 30
    const u = next.users.find((x) => x.id === p.userId)!
    next = patchUser(next, p.userId, { baseAccess: [...u.baseAccess.filter((a) => a.niche !== product.meta?.niche), { niche: product.meta?.niche ?? 'all', until: addDays(days) }] })
    next = notify(next, p.userId, `Доступ к базе резюме «${product.meta?.niche}» открыт на ${days} дней`, '/employer/base')
  }
  if (product.type === 'vacancy' && product.refId) {
    const status = next.settings.premoderation ? 'moderation' : 'active'
    next = { ...next, vacancies: next.vacancies.map((v) => (v.id === product.refId ? { ...v, status, createdAt: nowIso(), expiresAt: addDays(30) } : v)) }
    next = notify(next, p.userId, status === 'active' ? `Вакансия опубликована и появилась в Jobs ✅` : 'Вакансия оплачена и отправлена на модерацию', '/employer/vacancies')
    if (status === 'moderation') next = notify(next, 'staff', `Новая вакансия на модерации: ${product.label}`, '/admin?s=jobs')
  }
  return notify(next, p.userId, `Оплата ${p.id} прошла успешно. Чек отправлен на e-mail`, '/settings?tab=payments')
}

function revokeGrants(d: DB, p: Payment): DB {
  const { product } = p
  if (product.type === 'course') return { ...d, enrollments: d.enrollments.filter((e) => !(e.userId === p.userId && e.courseId === product.refId)) }
  if (product.type === 'base') {
    const u = d.users.find((x) => x.id === p.userId)!
    return patchUser(d, p.userId, { baseAccess: u.baseAccess.filter((a) => a.niche !== product.meta?.niche) })
  }
  if (product.type === 'vacancy') return { ...d, vacancies: d.vacancies.map((v) => (v.id === product.refId ? { ...v, status: 'closed' } : v)) }
  return d
}

export function checkPromo(d: DB, code: string, type: ProductType, amount: number): { promo?: Promo; discount: number; error?: string } {
  const p = d.promos.find((x) => x.code.toUpperCase() === code.trim().toUpperCase())
  if (!p || !p.active) return { discount: 0, error: 'Промокод не найден' }
  if (p.until && new Date(p.until) < new Date()) return { discount: 0, error: 'Срок промокода истёк' }
  if (p.used >= p.maxUses) return { discount: 0, error: 'Лимит использований исчерпан' }
  if (p.product !== 'all' && p.product !== type) return { discount: 0, error: 'Промокод не действует на этот продукт' }
  const discount = p.type === 'percent' ? Math.round((amount * p.value) / 100) : Math.min(amount, p.value)
  return { promo: p, discount }
}

/** Выдать сертификат, если пройдены все уроки курса */
function maybeCertificate(d: DB, userId: string, courseId: string): DB {
  const c = d.courses.find((x) => x.id === courseId)
  const u = d.users.find((x) => x.id === userId)
  if (!c || !u || !c.certificate || d.certificates.some((x) => x.userId === userId && x.courseId === courseId)) return d
  const all = lessonIds(c)
  const done = new Set(u.courseProgress[courseId] ?? [])
  if (!all.length || !all.every((id) => done.has(id))) return d
  const number = `BV-${new Date().getFullYear()}-${String(d.certificates.length + 148).padStart(4, '0')}`
  const next = { ...d, certificates: [...d.certificates, { id: uid('cert'), number, userId, courseId, title: `${c.title} — ${c.subtitle}`, issuedAt: nowIso() }] }
  return notify(next, userId, `🏆 Сертификат «${c.title}» выдан и добавлен в профиль`, '/certificates')
}

/* ───────── контекст ───────── */

interface Store {
  db: DB
  me: User | null
  update: (fn: (d: DB) => DB) => void
  login: (email: string, password: string) => string | null
  loginAs: (userId: string) => void
  logout: () => void
  registerCandidate: (p: Partial<User> & { email: string; password: string; name: string }, resume: Partial<Resume>) => string | null
  registerEmployer: (p: { name: string; phone: string; email: string; password: string; city: string }, company: { name: string; employees: string; industry: string; turnover: string }) => string | null
  updateMe: (patch: Partial<User>) => void
  setTheme: (theme: ThemeName, mode: ThemeMode) => void
  theme: { theme: ThemeName; mode: ThemeMode; resolved: 'light' | 'dark' }

  toggleFavorite: (vacancyId: string) => void
  saveResume: (r: Resume) => void
  apply: (vacancyId: string, resumeId: string, coverLetter: string) => void
  setAppStatus: (id: string, status: ApplicationStatus) => void
  inviteCandidate: (vacancyId: string, resumeId: string, text: string) => string
  saveVacancy: (v: Vacancy) => void

  pay: (p: { type: ProductType; refId?: string; label: string; meta?: Record<string, string> }, amount: number, method: 'kaspi' | 'card', promo?: string) => Payment
  setPaymentStatus: (id: string, status: Payment['status']) => void
  createLead: (l: Omit<Lead, 'id' | 'status' | 'createdAt'>) => void

  openThread: (otherId: string, title: string, vacancyId?: string) => string
  openSupport: (title: string, firstMessage?: string) => string
  sendMessage: (threadId: string, text: string, attachments?: Attachment[]) => void
  markThreadRead: (threadId: string) => void
  markNotificationsRead: () => void

  saveTestResult: (r: TestResult) => void
  toggleLesson: (courseId: string, lessonId: string, done?: boolean) => void
  submitAnswer: (courseId: string, lessonId: string, text: string, attachments: Attachment[]) => void
  replyAnswer: (answerId: string, text: string) => void
  setAnswerStatus: (answerId: string, status: AnswerStatus) => void
  grantCourse: (userId: string, courseId: string, until?: string) => void
  revokeCourse: (userId: string, courseId: string) => void
  bumpStat: (k: keyof DB['stats']) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'auto') return mode
  const h = new Date().getHours()
  return h >= 7 && h < 20 ? 'light' : 'dark' // день — светлая, ночь — тёмная
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [sessionId, setSessionId] = useState<string | null>(() => lsGet(SESSION_KEY))
  const [guestTheme, setGuestTheme] = useState<{ theme: ThemeName; mode: ThemeMode }>(() => {
    try {
      return JSON.parse(lsGet(GUEST_THEME_KEY) ?? '') as { theme: ThemeName; mode: ThemeMode }
    } catch {
      return { theme: 'classic', mode: 'auto' }
    }
  })
  const [tick, setTick] = useState(0)

  indexTests(db)

  useEffect(() => lsSet(DB_KEY, JSON.stringify(db)), [db])
  useEffect(() => lsSet(SESSION_KEY, sessionId), [sessionId])

  const me = useMemo(() => db.users.find((u) => u.id === sessionId && !u.blocked) ?? null, [db.users, sessionId])
  const themeSrc = me?.settings ?? guestTheme
  const resolved = resolveMode(themeSrc.mode)

  // применяем тему к документу; «авто» пересчитывается каждые 10 минут
  useEffect(() => {
    document.documentElement.dataset.theme = themeSrc.theme
    document.documentElement.dataset.mode = resolved
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim())
  }, [themeSrc.theme, resolved, tick])
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 600000)
    return () => window.clearInterval(id)
  }, [])

  const update = useCallback((fn: (d: DB) => DB) => setDb((d) => fn(d)), [])

  const store: Store = {
    db,
    me,
    update,
    theme: { ...themeSrc, resolved },

    login(email, password) {
      const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!u || u.password !== password) return 'Неверный e-mail или пароль'
      if (u.blocked) return 'Аккаунт заблокирован. Напишите в поддержку.'
      setSessionId(u.id)
      update((d) => log(d, u.id, 'Вход в приложение'))
      return null
    },
    loginAs(userId) {
      setSessionId(userId)
    },
    logout() {
      setSessionId(null)
    },

    registerCandidate(p, resume) {
      if (db.users.some((x) => x.email.toLowerCase() === p.email.trim().toLowerCase())) return 'Этот e-mail уже зарегистрирован'
      const id = uid('u')
      const user: User = {
        id, email: p.email.trim(), password: p.password, name: p.name, phone: p.phone ?? '', city: p.city ?? 'Алматы', age: p.age, role: 'candidate',
        avatarColor: ['#8a6a4d', '#9b6b52', '#5f7c6a', '#6f7d8c', '#7a6688'][Math.floor(Math.random() * 5)],
        createdAt: nowIso(), lastActiveAt: nowIso(), favorites: [], savedNews: [], testResults: {}, courseProgress: {}, baseAccess: [],
        interests: p.interests ?? [], settings: { ...guestTheme, push: true, email: true, whatsapp: false }, activity: [{ at: nowIso(), text: 'Регистрация' }],
        onboarded: true, consentAt: nowIso(), phoneVerified: true, emailVerified: false,
      }
      const r: Resume = {
        id: uid('r'), userId: id, fullName: p.name, position: '', category: 'Business Assistant', city: user.city, age: p.age, phone: user.phone, email: user.email,
        telegram: '', whatsapp: user.phone, goal: '', about: '', format: 'hybrid', employment: 'full', experience: 'none', skills: [], tools: [],
        languages: [{ name: 'Русский', level: 'Родной' }], work: [], education: [], portfolio: [], visible: true, updatedAt: nowIso(), ...resume,
      }
      update((d) => notify({ ...d, users: [...d.users, user], resumes: [...d.resumes, r] }, id, 'Добро пожаловать в BOSS VISION! Начните с теста MBTI — он обязателен для полного профиля', '/tests/mbti'))
      setSessionId(id)
      return null
    },

    registerEmployer(p, company) {
      if (db.users.some((x) => x.email.toLowerCase() === p.email.trim().toLowerCase())) return 'Этот e-mail уже зарегистрирован'
      const id = uid('u')
      const companyId = uid('co')
      const user: User = {
        id, email: p.email.trim(), password: p.password, name: p.name, phone: p.phone, city: p.city, role: 'employer', avatarColor: '#3a2f27', companyId,
        createdAt: nowIso(), lastActiveAt: nowIso(), favorites: [], savedNews: [], testResults: {}, courseProgress: {}, baseAccess: [], interests: [],
        settings: { ...guestTheme, push: true, email: true, whatsapp: true }, activity: [{ at: nowIso(), text: 'Регистрация компании' }],
        onboarded: true, consentAt: nowIso(), phoneVerified: true, emailVerified: true,
      }
      update((d) => notify({ ...d, users: [...d.users, user], companies: [...d.companies, { id: companyId, ownerId: id, city: p.city, about: '', ...company }] }, id, 'Компания зарегистрирована. Создайте первую вакансию или запустите AI-подбор', '/employer/vacancies/new'))
      setSessionId(id)
      return null
    },

    updateMe(patch) {
      if (me) update((d) => patchUser(d, me.id, patch))
    },
    setTheme(theme, mode) {
      if (me) update((d) => patchUser(d, me.id, { settings: { ...me.settings, theme, mode } }))
      else {
        setGuestTheme({ theme, mode })
        lsSet(GUEST_THEME_KEY, JSON.stringify({ theme, mode }))
      }
    },

    toggleFavorite(vacancyId) {
      if (!me) return
      const has = me.favorites.includes(vacancyId)
      update((d) => ({
        ...patchUser(d, me.id, { favorites: has ? me.favorites.filter((x) => x !== vacancyId) : [...me.favorites, vacancyId] }),
        vacancies: d.vacancies.map((v) => (v.id === vacancyId ? { ...v, saves: Math.max(0, v.saves + (has ? -1 : 1)) } : v)),
      }))
    },

    saveResume(r) {
      update((d) => {
        const exists = d.resumes.some((x) => x.id === r.id)
        const next = { ...r, updatedAt: nowIso() }
        return log({ ...d, resumes: exists ? d.resumes.map((x) => (x.id === r.id ? next : x)) : [...d.resumes, next] }, r.userId, 'Обновил(а) резюме')
      })
    },

    apply(vacancyId, resumeId, coverLetter) {
      if (!me) return
      const v = db.vacancies.find((x) => x.id === vacancyId)
      if (!v) return
      const app: Application = { id: uid('a'), vacancyId, resumeId, candidateId: me.id, employerId: v.ownerId, coverLetter, status: 'new', source: 'apply', createdAt: nowIso(), updatedAt: nowIso() }
      update((d) => log(notify({ ...d, applications: [app, ...d.applications] }, v.ownerId, `Новый отклик на «${v.title}» от ${me.name}`, `/employer/applicants?v=${v.id}`), me.id, `Откликнулся(ась) на «${v.title}»`))
    },

    setAppStatus(id, status) {
      update((d) => {
        const a = d.applications.find((x) => x.id === id)
        const v = a && d.vacancies.find((x) => x.id === a.vacancyId)
        let next: DB = { ...d, applications: d.applications.map((x) => (x.id === id ? { ...x, status, updatedAt: nowIso() } : x)) }
        if (a && v) {
          const text: Partial<Record<ApplicationStatus, string>> = {
            viewed: 'Работодатель просмотрел ваш профиль',
            invited: 'Вас пригласили',
            interview: 'Назначено собеседование',
            offer: '🎉 Вам сделали оффер',
            hired: '🏆 Поздравляем! Вы приняты',
            rejected: 'Работодатель ответил отказом',
          }
          if (text[status] && a.status !== status) next = notify(next, a.candidateId, `${text[status]}: «${v.title}»`, '/applications')
        }
        return next
      })
    },

    inviteCandidate(vacancyId, resumeId, text) {
      const v = db.vacancies.find((x) => x.id === vacancyId)!
      const r = db.resumes.find((x) => x.id === resumeId)!
      const existing = db.applications.find((a) => a.vacancyId === vacancyId && a.resumeId === resumeId)
      update((d) => {
        const apps = existing
          ? d.applications.map((a) => (a.id === existing.id ? { ...a, status: 'invited' as const, updatedAt: nowIso() } : a))
          : [{ id: uid('a'), vacancyId, resumeId, candidateId: r.userId, employerId: v.ownerId, coverLetter: '', status: 'invited' as const, source: 'invite' as const, createdAt: nowIso(), updatedAt: nowIso() }, ...d.applications]
        return notify({ ...d, applications: apps }, r.userId, `Работодатель приглашает вас: «${v.title}»`, '/chats')
      })
      const t = store.openThread(r.userId, v.title, vacancyId)
      store.sendMessage(t, text)
      return t
    },

    saveVacancy(v) {
      update((d) => {
        const exists = d.vacancies.some((x) => x.id === v.id)
        return { ...d, vacancies: exists ? d.vacancies.map((x) => (x.id === v.id ? v : x)) : [v, ...d.vacancies] }
      })
    },

    pay(product, amount, method, promo) {
      const p: Payment = { id: `PAY-${1000 + db.payments.length + 1}`, userId: me!.id, product, amount, method, promo, status: 'success', createdAt: nowIso() }
      update((d) => {
        let next: DB = { ...d, payments: [p, ...d.payments] }
        if (promo) next = { ...next, promos: next.promos.map((x) => (x.code === promo ? { ...x, used: x.used + 1 } : x)) }
        return log(applyGrants(next, p), p.userId, `Оплата: ${product.label}`)
      })
      return p
    },

    setPaymentStatus(id, status) {
      update((d) => {
        const p = d.payments.find((x) => x.id === id)
        if (!p) return d
        let next: DB = { ...d, payments: d.payments.map((x) => (x.id === id ? { ...x, status } : x)) }
        if (status === 'success' && p.status !== 'success') next = applyGrants(next, { ...p, status })
        if (status === 'refunded' && p.status === 'success') next = notify(revokeGrants(next, p), p.userId, `Возврат по платежу ${p.id} оформлен`)
        return next
      })
    },

    createLead(l) {
      update((d) => notify({ ...d, leads: [{ ...l, id: uid('ld'), status: 'new', createdAt: nowIso() }, ...d.leads] }, 'staff', `Новая заявка: ${l.type === 'recruitment' ? 'подбор под ключ' : 'кадровая подписка'} — ${l.name}`, '/admin?s=sales&i=leads'))
    },

    openThread(otherId, title, vacancyId) {
      if (!me) return ''
      const found = db.threads.find((t) => t.kind === 'work' && t.participants.includes(me.id) && t.participants.includes(otherId) && t.vacancyId === vacancyId)
      if (found) return found.id
      const id = uid('th')
      update((d) => ({ ...d, threads: [{ id, kind: 'work', participants: [me.id, otherId], vacancyId, title, updatedAt: nowIso(), unreadFor: [] }, ...d.threads] }))
      return id
    },

    openSupport(title, firstMessage) {
      if (!me) return ''
      const found = db.threads.find((t) => t.kind === 'support' && t.participants[0] === me.id)
      const id = found?.id ?? uid('th')
      if (!found) update((d) => ({ ...d, threads: [{ id, kind: 'support', participants: [me.id], title, updatedAt: nowIso(), unreadFor: [] }, ...d.threads] }))
      if (firstMessage) store.sendMessage(id, firstMessage)
      return id
    },

    sendMessage(threadId, text, attachments = []) {
      if (!me || (!text.trim() && !attachments.length)) return
      const staff = me.role === 'admin' || me.role === 'curator'
      update((d) => {
        const t = d.threads.find((x) => x.id === threadId)
        const others = !t ? [] : t.kind === 'support' ? (staff ? [t.participants[0]] : ['staff']) : t.participants.filter((p) => p !== me.id)
        let next: DB = {
          ...d,
          messages: [...d.messages, { id: uid('m'), threadId, fromId: me.id, text: text.trim(), attachments, createdAt: nowIso() }],
          threads: d.threads.map((x) => (x.id === threadId ? { ...x, updatedAt: nowIso(), unreadFor: Array.from(new Set([...x.unreadFor.filter((p) => p !== me.id && !(staff && p === 'staff')), ...others])) } : x)),
        }
        for (const o of others) if (o !== 'staff') next = notify(next, o, `Новое сообщение от ${me.name}`, `/chats/${threadId}`)
        return next
      })
    },

    markThreadRead(threadId) {
      if (!me) return
      const staff = me.role === 'admin' || me.role === 'curator'
      const t = db.threads.find((x) => x.id === threadId)
      if (!t || !t.unreadFor.some((p) => p === me.id || (staff && p === 'staff'))) return
      update((d) => ({ ...d, threads: d.threads.map((x) => (x.id === threadId ? { ...x, unreadFor: x.unreadFor.filter((p) => p !== me.id && !(staff && p === 'staff')) } : x)) }))
    },

    markNotificationsRead() {
      if (!me) return
      const staff = me.role === 'admin' || me.role === 'curator'
      update((d) => ({ ...d, notifications: d.notifications.map((n) => (n.userId === me.id || (staff && n.userId === 'staff') ? { ...n, read: true } : n)) }))
    },

    saveTestResult(r) {
      if (!me) return
      update((d) => {
        const u = d.users.find((x) => x.id === me.id)!
        return notify(log(patchUser(d, me.id, { testResults: { ...u.testResults, [r.testId]: r } }), me.id, `Прошёл(ла) тест «${r.title}»`), me.id, `Тест «${r.title}» завершён: ${r.summary}`, `/tests/${r.testId}`)
      })
    },

    toggleLesson(courseId, lessonId, done) {
      if (!me) return
      update((d) => {
        const u = d.users.find((x) => x.id === me.id)!
        const cur = u.courseProgress[courseId] ?? []
        const isDone = cur.includes(lessonId)
        const want = done ?? !isDone
        if (want === isDone) return d
        const next = patchUser(d, me.id, { courseProgress: { ...u.courseProgress, [courseId]: want ? [...cur, lessonId] : cur.filter((x) => x !== lessonId) } })
        return want ? maybeCertificate(next, me.id, courseId) : next
      })
    },

    submitAnswer(courseId, lessonId, text, attachments) {
      if (!me) return
      const c = db.courses.find((x) => x.id === courseId)
      const lesson = c?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId)
      update((d) => {
        const existing = d.answers.find((a) => a.userId === me.id && a.lessonId === lessonId)
        const answers = existing
          ? d.answers.map((a) => (a.id === existing.id ? { ...a, text, attachments, status: 'pending' as const, createdAt: nowIso() } : a))
          : [{ id: uid('ans'), userId: me.id, courseId, lessonId, text, attachments, status: 'pending' as const, replies: [], createdAt: nowIso() }, ...d.answers]
        return notify({ ...d, answers }, 'staff', `Новое задание на проверку: ${c?.title} — «${lesson?.title}» от ${me.name}`, '/admin?s=academy&i=answers')
      })
    },

    replyAnswer(answerId, text) {
      if (!me || !text.trim()) return
      update((d) => {
        const a = d.answers.find((x) => x.id === answerId)
        if (!a) return d
        const next = { ...d, answers: d.answers.map((x) => (x.id === answerId ? { ...x, replies: [...x.replies, { id: uid('rp'), authorId: me.id, text: text.trim(), createdAt: nowIso() }] } : x)) }
        return notify(next, a.userId, 'Куратор ответил на ваше задание 💬', `/academy/${a.courseId}/lesson/${a.lessonId}`)
      })
    },

    setAnswerStatus(answerId, status) {
      update((d) => {
        const a = d.answers.find((x) => x.id === answerId)
        if (!a) return d
        let next: DB = { ...d, answers: d.answers.map((x) => (x.id === answerId ? { ...x, status } : x)) }
        if (status === 'accepted') {
          const u = next.users.find((x) => x.id === a.userId)!
          const cur = u.courseProgress[a.courseId] ?? []
          if (!cur.includes(a.lessonId)) next = maybeCertificate(patchUser(next, a.userId, { courseProgress: { ...u.courseProgress, [a.courseId]: [...cur, a.lessonId] } }), a.userId, a.courseId)
          next = notify(next, a.userId, 'Задание принято ✅', `/academy/${a.courseId}/lesson/${a.lessonId}`)
        }
        if (status === 'needs_revision') next = notify(next, a.userId, 'Задание нужно доработать ↩', `/academy/${a.courseId}/lesson/${a.lessonId}`)
        return next
      })
    },

    grantCourse(userId, courseId, until) {
      update((d) => grantCourse(d, userId, courseId, 'admin', until))
    },
    revokeCourse(userId, courseId) {
      update((d) => ({ ...d, enrollments: d.enrollments.filter((e) => !(e.userId === userId && e.courseId === courseId)) }))
    },
    bumpStat(k) {
      update((d) => ({ ...d, stats: { ...d.stats, [k]: d.stats[k] + 1 } }))
    },
    reset() {
      setDb(createSeed())
    },
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

export function useMe() {
  return useStore().me!
}

export const isStaff = (u: User | null) => u?.role === 'admin' || u?.role === 'curator'
